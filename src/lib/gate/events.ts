/**
 * Gate Records — event recorder + dispatcher + automation engine.
 *
 * REUSE + EXTEND strategy (see docs/gate/SPEC-VS-LIVE.md):
 *   - `movement_logs` is the universal person-scan log (movement, hostel_gate).
 *   - `visitor_logs` is the visitor lifecycle.
 *   - `gate_passes` is read-only pass verification.
 *   - `gate_exceptions`, `gate_device_events`, `vehicle_entries`,
 *     `shift_handovers`, `exam_access_log` are the new satellites.
 *   - `security` events fold into the existing `emergency_alerts` table.
 *
 * The blueprint's `record_target` column tells the dispatcher which table to
 * write. Operators never see that — it is a backend routing decision.
 *
 * Hard constraints:
 *   - auto/derived fields are stripped from the client payload before insert;
 *   - premade values are validated against ref_categories (unknown → throw);
 *   - operator/admin responses mask subject_id / device_id UUIDs (the route
 *     applies `serializeGateEvent` unless isSuperAdmin).
 */
import { query } from "@/lib/postgres";
import { errMsg } from "@/lib/err-msg";
import {
  getBlueprint,
  type FieldBlueprint,
  type GateEventType,
  type GateType,
  type GateContext,
} from "./blueprints";
import { emitGateEvent } from "./sse";

export class GateValidationError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "GateValidationError";
  }
}

export interface RecordGateEventInput {
  role: string;
  gateId: string;
  gateType: GateType;
  eventType: GateEventType;
  context?: GateContext;
  deviceId?: string | null;
  operatorId: string;
  shiftId?: string | null;
  direction?: "IN" | "OUT" | "NA";
  subjectType?: string;
  subjectId?: string | null;
  subjectRef?: string | null;
  isManual?: boolean;
  payload: Record<string, unknown>;
}

export interface RecordedGateEvent {
  id: string;
  eventType: GateEventType;
  gateId: string;
  occurredAt: string;
  outcome: string;
  recordTarget: string;
  derived: Record<string, unknown>;
}

/** The dispatcher: event_type → (input, derived) → written event id + record_target. */
type Dispatcher = (
  input: RecordGateEventInput,
  payload: Record<string, unknown>,
  derived: Record<string, unknown>,
  outcome: string,
  occurredAt: Date
) => Promise<{ id: string; recordTarget: string }>;

// --- Automation rule helpers (each a single SQL round-trip) ---

async function isWatchlisted(
  subjectType?: string,
  subjectId?: string | null,
  subjectRef?: string | null
): Promise<boolean> {
  if (!subjectType) return false;
  const { rows } = await query(
    `SELECT 1 FROM public.visitor_watchlist
      WHERE subject_type = $1
        AND active
        AND (expires_at IS NULL OR expires_at > now())
        AND ( ($2::uuid IS NOT NULL AND user_id = $2::uuid)
           OR ($3 IS NOT NULL AND (subject_ref = $3 OR user_id::text = $3)) )
      LIMIT 1`,
    [subjectType, subjectId ?? null, subjectRef ?? null]
  );
  return rows.length > 0;
}

async function isCurfewViolation(
  direction: "IN" | "OUT" | "NA" | undefined,
  at: Date
): Promise<boolean> {
  if (direction !== "OUT") return false;
  const { rows } = await query(
    `SELECT 1 FROM public.ref_categories
      WHERE domain = 'curfew_window' AND code = 'in_time' AND active
        AND (metadata->>'start')::time <= ${at}::time
        AND (metadata->>'end')::time   >= ${at}::time
      LIMIT 1`
  );
  return rows.length > 0;
}

async function isDuplicate(
  subjectId: string | null | undefined,
  gateId: string,
  at: Date
): Promise<boolean> {
  if (!subjectId) return false;
  const { rows } = await query(
    `SELECT 1 FROM public.movement_logs
      WHERE user_id = $1 AND gate_id = $2
        AND timestamp > $3
      LIMIT 1`,
    [subjectId, gateId, new Date(at.getTime() - 30_000).toISOString()]
  );
  return rows.length > 0;
}

async function resolvePass(qr: string): Promise<Record<string, unknown>> {
  if (!qr) return { pass_status: "invalid" };
  const { rows } = await query(
    `SELECT id, reason, from_datetime, to_datetime, final_status
       FROM public.gate_passes WHERE qr_code = $1 LIMIT 1`,
    [qr]
  );
  if (rows.length === 0) return { pass_status: "invalid" };
  const p = rows[0];
  const now = new Date();
  const valid =
    new Date(p.from_datetime) <= now &&
    now <= new Date(p.to_datetime) &&
    p.final_status === "approved";
  return {
    pass_id: p.id,
    pass_status: valid ? "valid" : p.final_status === "rejected" ? "revoked" : "expired",
  };
}

async function resolveExamEligibility(
  candidateId: string | null | undefined
): Promise<Record<string, unknown>> {
  if (!candidateId) return { allowed: false, hall_ticket_status: "missing" };
  const { rows } = await query(
    `SELECT ht.id, ht.status, er.min_attendance_pct
       FROM public.hall_tickets ht
       LEFT JOIN public.config_exam_eligibility_rules er ON true
      WHERE ht.student_id = $1
      LIMIT 1`,
    [candidateId]
  );
  if (rows.length === 0) return { allowed: false, hall_ticket_status: "missing" };
  const ht = rows[0];
  return { allowed: ht.status === "valid", hall_ticket_status: ht.status };
}

async function recomputeOccupancy(
  direction: "IN" | "OUT" | "NA" | undefined,
  userId: string | null | undefined,
  gateId: string
): Promise<number> {
  if (!userId || direction === "NA") return 0;
  await query(
    `UPDATE public.campus_occupancy
        SET current_status = $1,
            last_gate_id   = $2,
            last_updated   = now()
      WHERE user_id = $3`,
    [direction === "IN" ? "in_campus" : "out_campus", gateId, userId]
  );
  return direction === "IN" ? 1 : -1;
}

// --- Dispatcher handlers (one per event type) ---

const writeMovementLog: Dispatcher = async (input, payload, derived, outcome, occurredAt) => {
  const p = payload as Record<string, any>;
  const { rows } = await query(
    `INSERT INTO public.movement_logs
       (user_id, direction, reason, gate_id, operator_id, is_manual,
        event_type, device_id, shift_id, verification_method, purpose_code,
        outcome, photo_url, geo, subject_ref,
        watchlist_hit, curfew_violation, duplicate_scan, payload)
     VALUES
       ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING id`,
    [
      input.subjectId ?? null,
      input.direction ?? "NA",
      String(p.reason ?? p.purpose_code ?? input.eventType),
      input.gateId,
      input.operatorId,
      Boolean(input.isManual ?? false),
      input.eventType,
      input.deviceId ?? null,
      input.shiftId ?? null,
      String(p.verification_method ?? "manual_entry"),
      p.purpose_code ?? null,
      outcome,
      p.photo_url ?? null,
      p.geo != null ? JSON.stringify(p.geo) : null,
      input.subjectRef ?? null,
      derived.watchlist_hit ?? false,
      derived.curfew_violation ?? false,
      derived.duplicate_scan ?? false,
      JSON.stringify({ ...p, _derived: derived }),
    ]
  );
  return { id: rows[0].id, recordTarget: "movement_logs" };
};

const writeVisitorLog: Dispatcher = async (input, payload, derived, _outcome, occurredAt) => {
  const p = payload as Record<string, any>;
  const { rows } = await query(
    `INSERT INTO public.visitor_logs
       (user_id, check_in_at, purpose, status,
        visitor_category, id_document_type, id_number, visitor_phone,
        vehicle_type, expected_duration, badge_no, host_ack_at, photo_url, payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING id`,
    [
      input.subjectId ?? null,
      occurredAt,
      String(p.purpose_code ?? p.host_lookup ?? "visitor"),
      "checked_in",
      p.visitor_category ?? null,
      p.id_document_type ?? null,
      p.id_number ?? null,
      p.visitor_phone ?? null,
      p.vehicle_type ?? null,
      p.expected_duration ?? null,
      p.badge_no ?? null,
      null, // host_ack_at — set when host responds
      p.photo_url ?? null,
      JSON.stringify({ ...p, _derived: derived }),
    ]
  );
  return { id: rows[0].id, recordTarget: "visitor_logs" };
};

const writeGatePassVerify: Dispatcher = async (input, payload, derived, outcome, _occurredAt) => {
  const p = payload as Record<string, any>;
  const { rows } = await query(
    `UPDATE public.gate_passes
        SET verification_method = $1,
            verification_result = $2,
            override_reason     = $3,
            used_at            = CASE WHEN $4 = 'valid' THEN now() ELSE used_at END
      WHERE qr_code = $5
      RETURNING id`,
    [
      String(p.verification_result ?? "pass_qr"),
      String(derived.pass_status ?? ""),
      p.override_reason ?? null,
      String(derived.pass_status ?? ""),
      String(p.pass_qr ?? ""),
    ]
  );
  return { id: rows[0]?.id ?? "", recordTarget: "gate_passes" };
};

const writeGateException: Dispatcher = async (input, payload, derived, _outcome, _occurredAt) => {
  const p = payload as Record<string, any>;
  const { rows } = await query(
    `INSERT INTO public.gate_exceptions
       (event_type, gate_id, operator_id, subject_type, subject_ref,
        exception_category, severity, resolution_action, source_event_id, notes, payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id`,
    [
      input.eventType,
      input.gateId,
      input.operatorId,
      input.subjectType ?? null,
      input.subjectRef ?? String(p.subject_ref ?? p.plate ?? ""),
      String(p.exception_category ?? "unspecified"),
      String(p.severity ?? "high"),
      p.resolution_action ?? null,
      p.source_event_id ?? null,
      p.notes ?? null,
      JSON.stringify({ ...p, _derived: derived }),
    ]
  );
  return { id: rows[0].id, recordTarget: "gate_exceptions" };
};

const writeSecurityEvent: Dispatcher = async (input, payload, derived, _outcome, occurredAt) => {
  const p = payload as Record<string, any>;
  // Security events fold into the existing emergency_alerts table.
  const { rows } = await query(
    `INSERT INTO public.emergency_alerts
       (student_id, alert_type, location, message, created_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      input.subjectId ?? null,
      String(p.security_event_type ?? "emergency_alert"),
      String(p.location ?? input.gateId),
      String(p.notes ?? p.authority ?? ""),
      occurredAt,
    ]
  );
  return { id: rows[0].id, recordTarget: "emergency_alerts" };
};

const writeDeviceEvent: Dispatcher = async (input, payload, derived, _outcome, occurredAt) => {
  const p = payload as Record<string, any>;
  // Upsert the device's state row.
  await query(
    `INSERT INTO public.gate_devices (gate_id, kind, serial, status, last_heartbeat_at, metadata)
     VALUES ($1, 'gate_terminal', $2, $3, now(), $4::jsonb)
     ON CONFLICT (gate_id, kind)
     DO UPDATE SET status = $3, last_heartbeat_at = now()`,
    [input.gateId, input.deviceId ?? "unknown", String(p.status ?? "unknown"), JSON.stringify({})]
  );
  const { rows } = await query(
    `INSERT INTO public.gate_device_events
       (device_id, gate_id, fault_code, status, payload, occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id`,
    [
      input.deviceId ?? null,
      input.gateId,
      String(p.fault_code ?? ""),
      String(p.status ?? "unknown"),
      JSON.stringify({ ...p, _derived: derived }),
      occurredAt,
    ]
  );
  return { id: rows[0].id, recordTarget: "gate_device_events" };
};

const writeShiftHandover: Dispatcher = async (input, payload, derived, _outcome, _occurredAt) => {
  const p = payload as Record<string, any>;
  const { rows } = await query(
    `INSERT INTO public.shift_handovers
       (by_user_id, to_role, items, notes, created_at)
     VALUES ($1, $2, $3::jsonb, $4, now())
     RETURNING id`,
    [
      input.operatorId,
      String(p.handover_to ?? "operator"),
      JSON.stringify({ ...p, _derived: derived }),
      String(p.open_issues ?? ""),
    ]
  );
  return { id: rows[0].id, recordTarget: "shift_handovers" };
};

const writeVehicleEntry: Dispatcher = async (input, payload, derived, _outcome, occurredAt) => {
  const p = payload as Record<string, any>;
  // Ensure the vehicle is registered (upsert by plate).
  await query(
    `INSERT INTO public.vehicles (plate, vehicle_type)
     VALUES ($1, $2)
     ON CONFLICT (plate) DO UPDATE SET vehicle_type = $2`,
    [String(p.plate ?? ""), p.vehicle_type ?? null]
  );
  const { rows } = await query(
    `INSERT INTO public.vehicle_entries
       (plate, gate_id, direction, purpose_code, photo_url, parking_slot, occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id`,
    [
      String(p.plate ?? ""),
      input.gateId,
      input.direction ?? "IN",
      p.purpose_code ?? null,
      p.photo_url ?? null,
      p.parking_slot ?? null,
      occurredAt,
    ]
  );
  return { id: rows[0].id, recordTarget: "vehicle_entries" };
};

const writeExamAccessLog: Dispatcher = async (input, payload, derived, _outcome, occurredAt) => {
  const p = payload as Record<string, any>;
  const { rows } = await query(
    `INSERT INTO public.exam_access_log
       (gate_id, candidate_id, session_id, allowed, hall_ticket_status,
        eligibility_status, exception_reason, exception_granted_by, occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [
      input.gateId,
      String(p.candidate_id ?? input.subjectRef ?? ""),
      String(p.session_id ?? ""),
      Boolean(derived.allowed ?? false),
      String(derived.hall_ticket_status ?? ""),
      String(derived.eligibility_status ?? ""),
      p.exception_reason ?? null,
      p.exception_granted_by ?? null,
      occurredAt,
    ]
  );
  return { id: rows[0].id, recordTarget: "exam_access_log" };
};

const DISPATCH: Record<GateEventType, Dispatcher> = {
  movement: writeMovementLog,
  hostel_gate: writeMovementLog, // universal person-scan log
  visitor: writeVisitorLog,
  pass: writeGatePassVerify,
  exception: writeGateException,
  security: writeSecurityEvent,
  device: writeDeviceEvent,
  shift: writeShiftHandover,
  vehicle: writeVehicleEntry,
  exam_access: writeExamAccessLog,
};

/**
 * Validate the payload against the role's blueprint: strip auto/derived
 * fields, require the mandatory ones, and check premade codes against
 * ref_categories.
 */
async function validateBlueprint(
  blueprint: FieldBlueprint[],
  payload: Record<string, unknown>
): Promise<void> {
  for (const f of blueprint) {
    if (f.fillMode === "auto" || f.fillMode === "derived") {
      delete payload[f.fieldKey];
    }
    if (f.required && (payload[f.fieldKey] == null || payload[f.fieldKey] === "")) {
      throw new GateValidationError(`Missing required field: ${f.fieldKey}`);
    }
  }
  const premade = blueprint.filter((f) => f.fillMode === "premade" && f.refDomain);
  for (const f of premade) {
    const v = payload[f.fieldKey];
    if (v == null || v === "") continue;
    const { rows } = await query(
      `SELECT 1 FROM public.ref_categories
        WHERE domain = $1 AND code = $2 AND active LIMIT 1`,
      [f.refDomain!, String(v)]
    );
    if (rows.length === 0) {
      throw new GateValidationError(`Invalid ${f.fieldKey}: ${v}`);
    }
  }
}

async function derive(input: RecordGateEventInput, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const derived: Record<string, unknown> = {};
  const occurredAt = new Date();

  if (input.eventType === "movement" || input.eventType === "hostel_gate" || input.eventType === "visitor") {
    derived.watchlist_hit = await isWatchlisted(input.subjectType, input.subjectId, input.subjectRef);
    derived.curfew_violation = await isCurfewViolation(input.direction, occurredAt);
    derived.duplicate_scan = await isDuplicate(input.subjectId, input.gateId, occurredAt);
  }
  if (input.eventType === "pass") {
    Object.assign(derived, await resolvePass(String(payload.pass_qr ?? "")));
  }
  if (input.eventType === "exam_access") {
    Object.assign(derived, await resolveExamEligibility(input.subjectId));
  }
  if (input.eventType === "movement" || input.eventType === "hostel_gate") {
    derived.occupancy_delta = await recomputeOccupancy(
      input.direction,
      input.subjectId ?? input.subjectRef ?? null,
      input.gateId
    );
  }
  return derived;
}

/**
 * Record a gate event: validate → derive → dispatch to the target table →
 * fan out automations → stream.
 */
export async function recordGateEvent(input: RecordGateEventInput): Promise<RecordedGateEvent> {
  const context = (input.context ?? "default") as GateContext;
  const blueprint = await getBlueprint({
    role: input.role,
    gateType: input.gateType,
    eventType: input.eventType,
    context,
  });

  const payload = { ...input.payload };
  await validateBlueprint(blueprint, payload);

  const derived = await derive(input, payload);

  const outcome =
    derived.watchlist_hit || derived.curfew_violation || derived.duplicate_scan
      ? "held"
      : input.eventType === "security" || input.eventType === "exception"
        ? "escalated"
        : "allowed";

  const dispatcher = DISPATCH[input.eventType];
  const occurredAt = new Date();
  const { id, recordTarget } = await dispatcher(input, payload, derived, outcome, occurredAt);

  // Fan-out: auto exception on watchlist hit, host-notify on visitor.
  await fanOut(input, id, derived);

  const event: RecordedGateEvent = {
    id,
    eventType: input.eventType,
    gateId: input.gateId,
    occurredAt: occurredAt.toISOString(),
    outcome,
    recordTarget,
    derived,
  };

  await emitGateEvent(input.gateId, event, derived, outcome);
  return event;
}

async function fanOut(
  input: RecordGateEventInput,
  eventId: string,
  derived: Record<string, unknown>
): Promise<void> {
  if (derived.watchlist_hit) {
    try {
      await query(
        `INSERT INTO public.gate_exceptions
           (event_type, gate_id, operator_id, subject_type, subject_ref,
            exception_category, severity, source_event_id, payload)
         VALUES ($1,$2,$3,$4,$5,'watchlist_hit','high',$6,$7)`,
        [
          "exception",
          input.gateId,
          input.operatorId,
          input.subjectType ?? null,
          input.subjectRef ?? null,
          eventId,
          JSON.stringify({ source: "watchlist_auto" }),
        ]
      );
    } catch (e) {
      console.error("[gate] watchlist auto-exception failed", errMsg(e));
    }
  }

  if (input.eventType === "visitor") {
    const hostRef = String((input.payload as Record<string, any>).host_lookup ?? "");
    if (hostRef) {
      try {
        await query(
          `INSERT INTO public.movement_logs
             (user_id, direction, reason, gate_id, operator_id, is_manual, event_type, payload)
           VALUES ($1, 'NA', 'visitor_host_notify', $2, $3, false, 'notification', $4)`,
          [hostRef, input.gateId, input.operatorId, JSON.stringify({ kind: "visitor_checkin", host_ack_pending: true, source_event_id: eventId })]
        );
      } catch (e) {
        console.error("[gate] visitor host-notify failed", errMsg(e));
      }
    }
  }
}
