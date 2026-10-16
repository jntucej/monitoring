import { randomUUID } from "crypto";
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

export async function recordScan(input: RecordScanInput): Promise<RecordScanResult> {
  // 1. Lockdown gate
  const lockdown = await findActiveLockdown();
  assertNotLockedOut(lockdown, input.gateId);

  // 2. Operator must hold a gate (supervisors via supervised_gates are exempt)
  assertOperatorHasGate(input.operatorRole, input.operatorGateId);

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
        lastMoveForOptions?.direction === "OUT" ? lastMoveForOptions.reason : null;

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
  });

  // If duplicate, the RPC returned the pre-existing row, not the one we sent.
  // Fetch it so the response is consistent.
  let finalLog = log;
  if (isDuplicate && log && typeof log === "object" && "id" in log) {
    finalLog = await findScanById(String((log as { id: string }).id));
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
