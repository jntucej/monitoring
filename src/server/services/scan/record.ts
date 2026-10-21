import { randomUUID } from "crypto";
import { query } from "@/lib/postgres";
import { assertNotLockedOut } from "@/server/policy/lockdown";
import {
  assertOperatorGateMatch,
  assertOperatorHasGate,
  checkBackGateGeo,
  type GeoInput,
} from "@/server/policy/gate-access";
import {
  normalizeExitReason,
  validateStudentExitFlow,
} from "@/lib/student-exit-flow";
import { resolveEntryOptions } from "@/lib/permission-workflow";
import { findActiveLockdown } from "@/server/repositories/lockdown/findActive";
import { findGateById } from "@/server/repositories/gates/findById";
import { findByUniqueId } from "@/server/repositories/users/findByUniqueId";
import { findOccupancyByUserId } from "@/server/repositories/occupancy/findByUserId";
import {
  findStudentDetailsByUserId,
  updateEntryType,
} from "@/server/repositories/studentDetails/findByUserId";
import { createScan } from "@/server/repositories/scans/create";
import { findScanById } from "@/server/repositories/scans/findById";
import { findLastMovementByUserId } from "@/server/repositories/scans/findLastByUserId";
import { validateRollNumber } from "@/lib/rollNumber";
import { auditWrite } from "@/server/services/audit/write";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/server/http/errors";
import { setUserFlag } from "@/lib/db";

/**
 * Duration caps for OUT-scan enforcement (hours from last IN to now).
 * daily_outing: 1 hour. day_pass: 12 hours. A student who has been out
 * longer than the cap is rejected (400) rather than warned, matching the
 * existing ConflictError/overdue pattern.
 */
const OUT_DURATION_CAPS_HOURS: Record<string, number> = {
  daily_outing: 1,
  day_pass: 12,
};
/** Duration caps for IN-return checks (hours from last OUT to now).
 *  home_out: 48h, special_leave: 24h. Silently flags OVERDUE if exceeded
 *  — the scan is allowed but the student's flag_status is updated. */
const IN_RETURN_CAPS_HOURS: Record<string, number> = {
  home_out: 48,
  special_leave: 24,
};

export interface RecordScanInput {
  roll?: string;
  personId?: string;
  direction: "IN" | "OUT";
  reason?: string;
  /**
   * Entry-type selection for a student's IN scan (hosteller vs day_scholar).
   * Optional and backward-compatible: when omitted, existing callers are
   * unaffected. For an IN scan on a student it MUST be present; for OUT scans
   * the scope check reads the stored current_entry_type instead.
   */
  entryType?: "hosteller" | "day_scholar";
  gateId: string;
  isManual?: boolean;
  clientEventId?: string;
  geo?: GeoInput;
  // Injected from AuthContext
  operatorId: string;
  operatorName: string;
  operatorRole: string;
  operatorGateId: string | null;
  supervisedGates?: string[] | null;
}

export interface RecordScanResult {
  log: Record<string, unknown>;
  isDuplicate: boolean;
  /**
   * Id of the modern permission pass consumed by this OUT scan, when one was
   * matched and marked COMPLETED/used. Null when no pass was consumed (no
   * match, duplicate scan, or IN direction). Used by the gate UI to surface
   * the ticket number the operator just cleared.
   */
  consumedPassId: string | null;
  person: {
    id: string;
    uniqueId: string;
    name: string;
    role: string;
    status: string;
    photoUrl: string | null;
  };
}

const OVERRIDING_ROLES = new Set(["admin", "sysadmin", "principal"]);

/**
 * Entry-type scope for OUT scans. A hosteller may use any of these exit
 * reasons; a day scholar may use day_scholar_out OR home_out (both are
 * legal day-scholar exits; home_out for a day scholar requires the
 * pre-assigned hostel room handled by the entry-type write flow).
 */
const OUT_REASONS_BY_ENTRY_TYPE: Record<
  "hosteller" | "day_scholar",
  readonly (ReturnType<typeof normalizeExitReason>)[]
> = {
  hosteller: ["daily_outing", "home_out", "day_pass", "emergency"],
  day_scholar: ["day_scholar_out", "home_out"],
};

/**
 * Enforce the entry-type OUT-scope. Normalizes the chosen reason, resolves
 * the effective entry type (a null/unknown stored type defaults to
 * hosteller with a warning), and throws ConflictError (code
 * HOSTEL_SCOPE_MISMATCH) when the reason is not permitted for that type.
 *
 * Called only for student OUT scans; non-students skip it entirely.
 */
function enforceOutScopeByEntryType(
  effectiveEntryType: "hosteller" | "day_scholar",
  rawReason: string | null | undefined,
): void {
  const normalized = normalizeExitReason(rawReason);
  const allowed = OUT_REASONS_BY_ENTRY_TYPE[effectiveEntryType];
  if (!allowed.includes(normalized)) {
    throw new ConflictError(
      `Reason "${normalized}" is not permitted for ${effectiveEntryType} exits. ` +
        `Allowed: ${allowed.join(", ")}.`,
      "HOSTEL_SCOPE_MISMATCH",
      { code: "HOSTEL_SCOPE_MISMATCH", entryType: effectiveEntryType },
    );
  }
}

/**
 * Enforce OUT-scan duration caps.
 *
 * For a student's OUT scan, the OUT window starts from the last IN scan. If
 * the reason has a duration cap (daily_outing: 1h, day_pass: 12h) and the
 * elapsed time from last IN to now exceeds the cap, the scan is rejected
 * with a ConflictError carrying the OVERDUE code.
 *
 * home_out and day_scholar_out have no cap and are skipped.
 */
async function enforceOutDurationCap(
  userId: string,
  reason: string | null | undefined,
): Promise<void> {
  const normalized = normalizeExitReason(reason);
  const capHours = OUT_DURATION_CAPS_HOURS[normalized];
  if (capHours === undefined) return; // no cap for this reason

  const lastMove = await findLastMovementByUserId(userId);
  if (!lastMove || lastMove.direction !== "IN") {
    // No recorded IN scan: cannot compute elapsed; skip the cap check.
    return;
  }

  const lastInMs = Date.parse(lastMove.timestamp);
  if (Number.isNaN(lastInMs)) return;

  const elapsedHours = (Date.now() - lastInMs) / (60 * 60 * 1000);
  if (elapsedHours > capHours) {
    const code =
      normalized === "daily_outing" ? "DAILY_OUTING_OVERDUE" : "DAY_PASS_OVERDUE";
    throw new ConflictError(
      `${normalized} exit overdue: student has been out for ${elapsedHours.toFixed(1)}h ` +
        `(cap ${capHours}h from last IN at ${lastMove.timestamp}).`,
      code,
      { code, reason: normalized, capHours, elapsedHours: Number(elapsedHours.toFixed(1)) },
    );
  }
}

/**
 * Enforce IN-return duration caps for home_out / special_leave tickets.
 * If the student has been out longer than the ticket's cap, flag them as
 * OVERDUE (non-fatal — the IN scan is still recorded).
 */
async function enforceInReturnDurationCap(
  userId: string,
  reason: string | null | undefined,
): Promise<void> {
  const normalized = normalizeExitReason(reason);
  const capHours = IN_RETURN_CAPS_HOURS[normalized];
  if (capHours === undefined) return;

  const lastOut = await findLastMovementByUserId(userId);
  if (!lastOut || lastOut.direction !== "OUT") return;

  const lastOutMs = Date.parse(lastOut.timestamp);
  if (Number.isNaN(lastOutMs)) return;

  const elapsedHours = (Date.now() - lastOutMs) / (60 * 60 * 1000);
  if (elapsedHours > capHours) {
    await setUserFlag(userId, "OVERDUE", userId);
    await auditWrite({
      action: "OVERDUE_RETURN_FLAGGED",
      userId,
      role: "system",
      details: {
        reason: normalized,
        capHours,
        elapsedHours: Number(elapsedHours.toFixed(1)),
        lastOutAt: lastOut.timestamp,
      },
    });
  }
}

export async function recordScan(input: RecordScanInput): Promise<RecordScanResult> {
  // 1. Lockdown gate
  const lockdown = await findActiveLockdown();
  assertNotLockedOut(lockdown, input.gateId);

  // 2. Operator must hold a gate (supervisors via supervised_gates are exempt)
  await assertOperatorHasGate(input.operatorRole, input.operatorGateId);

  // 3. Roll identifier must be present and well-formed
  const identifier = (input.roll ?? input.personId ?? "").trim();
  if (!identifier) throw new BadRequestError("roll or personId is required");
  if (!validateRollNumber(identifier) && !input.personId) {
    throw new BadRequestError("Invalid roll number format");
  }

  // 4. Gate must exist
  const gate = await findGateById(input.gateId);
  if (!gate) throw new NotFoundError("Gate not found");

  // 5. Operator↔gate assignment
  assertOperatorGateMatch(
    input.operatorRole,
    input.operatorGateId,
    gate.id,
    gate.gate_code,
    input.supervisedGates ?? null,
  );

  // 6. Back-gate geo check (rejection-capable)
  const geoCheck = checkBackGateGeo(gate, input.geo);
  if (!geoCheck.ok && geoCheck.reason === "too_far") {
    await auditWrite({
      action: "BACK_GATE_GEO_MISMATCH",
      userId: input.operatorId,
      role: input.operatorRole,
      details: {
        gateId: gate.id,
        gateCode: gate.gate_code,
        distanceMeters: geoCheck.distanceMeters,
      },
    });
    throw new ForbiddenError(
      `Back gate geo check failed: device is ${geoCheck.distanceMeters}m from the back gate`,
      "BACK_GATE_GEO_MISMATCH",
      { code: "BACK_GATE_GEO_MISMATCH" },
    );
  }

  // 7. Resolve person
  const person = await findByUniqueId(identifier);
  if (!person) throw new NotFoundError("Person not found");
  if (person.status !== "ACTIVE") {
    throw new ForbiddenError(`Account ${person.status}`);
  }

  // 8. Direction validation against campus_occupancy
  const occupancy = await findOccupancyByUserId(person.id);
  if (
    occupancy &&
    !OVERRIDING_ROLES.has(input.operatorRole)
  ) {
    if (occupancy.current_status === input.direction) {
      throw new ConflictError(
        `Last known direction for this person is ${occupancy.current_status} ` +
        `as of ${occupancy.last_updated}; same-direction scans are not accepted. ` +
        `Use a correction to override.`,
      );
    }
  }

  // 9. Student exit-flow enforcement (only for students). Manual entries are
  // subject to the SAME pass check as regular scans (spec §11 overrides §7).
  if (person.role === "student") {
    // 9a. IN scans: the operator MUST have selected an entry type. Reject
    //     early (before recording anything) with a clear 400. Additionally,
    //     the chosen entry type must be present in the resolved entry-options
    //     button set returned by resolveEntryOptions for the student's last
    //     OUT reason and current stored entry type; a mismatch is rejected
    //     with ENTRY_TYPE_MISMATCH (400).
    if (input.direction === "IN") {
      if (!input.entryType) {
        throw new BadRequestError(
          "Entry type must be selected for an IN scan: choose 'hosteller' or 'day_scholar'.",
          "ENTRY_TYPE_REQUIRED",
          { code: "ENTRY_TYPE_REQUIRED" },
        );
      }

      // resolveEntryOptions(lastOutReason, currentType) returns an EntryOptions
      // object with a `buttons` array of button IDs (return_to_hostel / home_in /
      // day_scholar_in). Each button maps to an entry type; the chosen entry
      // type must be offered by one of the returned buttons. A mismatch is
      // rejected with ENTRY_TYPE_MISMATCH (400).
      const detailsForOptions = await findStudentDetailsByUserId(person.id);
      const currentType =
        detailsForOptions?.current_entry_type === "hosteller" ||
        detailsForOptions?.current_entry_type === "day_scholar"
          ? detailsForOptions.current_entry_type
          : null;
      // lastOutReason: read from the most recent movement log for this user.
      const lastMoveForOptions = await findLastMovementByUserId(person.id);
      const lastOutReason =
        lastMoveForOptions?.direction === "OUT" ? normalizeExitReason(lastMoveForOptions.reason) : null;

      const entryOptions = resolveEntryOptions(lastOutReason, currentType);
      // Map button IDs to entry types so the chosen entryType can be checked
      // against the returned button set.
      const BUTTON_TO_ENTRY_TYPE: Record<string, "hosteller" | "day_scholar"> = {
        return_to_hostel: "hosteller",
        home_in: "hosteller",
        day_scholar_in: "day_scholar",
      };
      const allowedEntryTypes: string[] = entryOptions.buttons.map((b) => BUTTON_TO_ENTRY_TYPE[b] ?? "hosteller");
      if (!allowedEntryTypes.includes(input.entryType)) {
        throw new BadRequestError(
          `Entry type "${input.entryType}" is not offered for this re-entry. ` +
            `Allowed: ${allowedEntryTypes.join(", ")}.`,
          "ENTRY_TYPE_MISMATCH",
          { code: "ENTRY_TYPE_MISMATCH", entryType: input.entryType, allowed: allowedEntryTypes },
        );
      }
    }

    // 9b. OUT scans: read the stored entry type and enforce the scope.
    //     A null/unknown stored type defaults to hosteller (with a warning).
    let effectiveOutEntryType: "hosteller" | "day_scholar" | null = null;
    if (input.direction === "OUT") {
      const details = await findStudentDetailsByUserId(person.id);
      const storedType = details?.current_entry_type ?? null;
      if (storedType === "hosteller" || storedType === "day_scholar") {
        effectiveOutEntryType = storedType;
      } else {
        effectiveOutEntryType = "hosteller";
        console.warn(
          `[scan] current_entry_type null/unknown for student ${person.id} ` +
            `(stored=${String(storedType)}); defaulting to hosteller scope on OUT.`,
        );
      }
      enforceOutScopeByEntryType(effectiveOutEntryType, input.reason);

      // 9c. OUT-scan duration cap: reject if the student has been out longer
      //     than the reason's cap (daily_outing: 1h, day_pass: 12h).
      await enforceOutDurationCap(person.id, input.reason);

      // 9d. IN-return duration cap for home_out / special_leave (non-fatal).
      //     Flags the student as OVERDUE but allows the scan through.
      await enforceInReturnDurationCap(person.id, input.reason);
    }

    const flow = await validateStudentExitFlow(
      person.unique_id,
      input.direction,
      input.reason ?? null,
    );
    if (!flow.allowed) {
      throw new ForbiddenError(
        flow.error ?? "No approved gate pass on file",
        "NO_GATE_PASS",
        { code: "NO_GATE_PASS" },
      );
    }
  }
  // 10. Insert via RPC (atomic, dedup-aware)
  const scanId = input.clientEventId ?? randomUUID();
  const { log, isDuplicate } = await createScan({
    scanId,
    userId: person.id,
    direction: input.direction,
    reason: input.reason ?? null,
    gateId: gate.id,
    gateName: gate.name,
    operatorId: input.operatorId,
    operatorName: input.operatorName,
    timestamp: new Date().toISOString(),
    isManual: input.isManual ?? false,
    // Dedup window disabled (0): same-direction rescans are no longer
    // rejected by the time window. The occupancy same-direction check above
    // still guards against true double-records; manual corrections override.
    dupWindowMinutes: 0,
  });

  // If duplicate, the RPC returned the pre-existing row, not the one we sent.
  // Fetch it so the response is consistent.
  let finalLog = log;
  if (isDuplicate && log && typeof log === "object" && "id" in log) {
    finalLog = await findScanById(String((log as { id: string }).id));
  }

  // 10b. Consume the linked modern permission pass on a successful OUT scan.
  //      This prevents the same approved pass from being reused.
  const normReason = normalizeExitReason(input.reason);
  let consumedPassId: string | null = null;
  if (!isDuplicate && input.direction === "OUT") {
    if (["home_out", "day_pass", "special_leave", "emergency"].includes(normReason)) {
      // Consume the most recent unused approved pass for this reason. Track
      // consumption (used_at / used_at_gate / used_at_scan) so the gate UI and
      // the returns timeline can distinguish "used" from "expired".
      const { rows: consumed } = await query<{ id: string; ticket_number: string }>(
        `UPDATE public.permissions
            SET status = 'COMPLETED',
                current_stage = 'completed',
                used_at = NOW(),
                used_at_gate = $3,
                used_at_scan = $4,
                updated_at = NOW()
          WHERE id = (
            SELECT p.id FROM public.permissions p
             WHERE p.requester_user_id = $1
               AND p.workflow_type = 'hostel'
               AND p.status = 'APPROVED'
               AND p.reason = $2
               AND p.used_at IS NULL
             ORDER BY p.created_at DESC
             LIMIT 1
          )
          RETURNING id, ticket_number`,
        [person.id, normReason, gate.id, (finalLog as { id?: string })?.id ?? null],
      );
      if (consumed[0]) {
        consumedPassId = consumed[0].id;
        await auditWrite({
          action: "PASS_CONSUMED_ON_SCAN",
          userId: input.operatorId,
          role: input.operatorRole,
          details: {
            passId: consumed[0].id,
            ticketNumber: consumed[0].ticket_number,
            scanId: (finalLog as { id?: string })?.id ?? null,
            gateId: gate.id,
            personId: person.id,
          },
        });

        // M18: a home_out student is off-campus for the pass window, so any
        // mess token + "will be present" preference inside that window is
        // wasted food. Auto-revoke the tokens and clear the preferences.
        // Non-fatal: a mess-table failure must not roll back the scan.
        if (normReason === "home_out") {
          try {
            const fromDate = new Date().toISOString().slice(0, 10);
            const { rows: passEnd } = await query<{ to_date: string | null }>(
              `SELECT to_date FROM public.permissions
                WHERE id = $1 AND to_date IS NOT NULL LIMIT 1`,
              [consumedPassId],
            );
            const toDate = passEnd[0]?.to_date?.slice(0, 10) ?? fromDate;

            const { rowCount: revokedCount } = await query(
              `UPDATE public.mess_tokens t
                  SET revoked_at = NOW(), revoked_by = $2::uuid
                FROM public.mess_days d
               WHERE t.mess_day_id = d.id
                 AND t.user_id = $1
                 AND t.used_at IS NULL
                 AND t.revoked_at IS NULL
                 AND d.meal_date BETWEEN $3::date AND $4::date`,
              [person.id, input.operatorId, fromDate, toDate],
            );
            // Clear their mess preferences for the covered window so they
            // aren't counted as "present" for analytics.
            await query(
              `UPDATE public.mess_preferences p
                  SET will_be_present = FALSE
                FROM public.mess_days d
               WHERE p.mess_day_id = d.id
                 AND p.user_id = $1
                 AND d.meal_date BETWEEN $2::date AND $3::date`,
              [person.id, fromDate, toDate],
            );
            await auditWrite({
              action: "MESS_TOKENS_REVOKED_HOME_OUT",
              userId: input.operatorId,
              role: input.operatorRole,
              details: {
                personId: person.id,
                passId: consumedPassId,
                window: { fromDate, toDate },
                revokedTokens: revokedCount ?? 0,
              },
            });
          } catch (err) {
            // Best-effort: log but do not fail the scan.
            console.error("[recordScan] M18 mess auto-revoke failed:", err);
          }
        }
      }
    }
  }

  // 10c. Guard: reject home_in if there was no prior OUT with a matching leave
  //      reason. This prevents phantom round-trips that corrupt movement_logs
  //      and can change a day-scholar's entry type without any legitimate exit.
  if (!isDuplicate && input.direction === "IN" && normReason === "home_in") {
    const lastOut = await findLastMovementByUserId(person.id);
    const lastOutNorm = lastOut?.direction === "OUT"
      ? normalizeExitReason(lastOut.reason)
      : null;
    if (lastOutNorm !== "home_out") {
      throw new BadRequestError(
        `home_in requires a prior home_out scan. No matching prior outbound found.`,
        "NO_PRIOR_HOME_OUT",
        { code: "NO_PRIOR_HOME_OUT" },
      );
    }
  }

  // 11. Audit (only when this was a real insert)
  if (!isDuplicate) {
    if (input.isManual) {
      await auditWrite({
        action: "MANUAL_ENTRY_AUTHORIZED",
        userId: input.operatorId,
        role: input.operatorRole,
        details: {
          operatorId: input.operatorId,
          personId: person.id,
          direction: input.direction,
          reason: input.reason ?? null,
          scanId,
        },
      });
    }
    await auditWrite({
      action: "GATE_SCAN_RECORDED",
      userId: input.operatorId,
      role: input.operatorRole,
      details: {
        scanId,
        personId: person.id,
        personUniqueId: person.unique_id,
        direction: input.direction,
        gateId: gate.id,
        gateName: gate.name,
      },
    });

    // 12. Persist the entry-type choice on student_details and audit the
    //     change. Only for a real student IN scan that actually carried an
    //     entry type. The type update is non-fatal (a failure cannot roll
    //     back the already-recorded scan) and the audit write is also
    //     self-contained (auditWrite swallows errors).
    if (
      input.direction === "IN" &&
      person.role === "student" &&
      input.entryType
    ) {
      await updateEntryType({
        userId: person.id,
        entryType: input.entryType,
        gateId: gate.id,
        chosenAt: new Date().toISOString(),
      });
      await auditWrite({
        action: "STUDENT_TYPE_CHANGED_AT_ENTRY",
        userId: input.operatorId,
        role: input.operatorRole,
        details: {
          personId: person.id,
          personUniqueId: person.unique_id,
          entryType: input.entryType,
          gateId: gate.id,
          gateName: gate.name,
          scanId,
        },
      });
    }
  }

  return {
    log: finalLog ?? {},
    isDuplicate,
    consumedPassId,
    person: {
      id: person.id,
      uniqueId: person.unique_id,
      name: person.name,
      role: person.role,
      status: person.status,
      photoUrl: person.photo_url,
    },
  };
}
