import { randomUUID } from "crypto";
import { assertNotLockedOut } from "@/server/policy/lockdown";
import {
  assertOperatorGateMatch,
  assertOperatorHasGate,
  checkBackGateGeo,
  type GeoInput,
} from "@/server/policy/gate-access";
import { validateStudentExitFlow } from "@/lib/student-exit-flow";
import { findActiveLockdown } from "@/server/repositories/lockdown/findActive";
import { findGateById } from "@/server/repositories/gates/findById";
import { findByUniqueId } from "@/server/repositories/users/findByUniqueId";
import { findOccupancyByUserId } from "@/server/repositories/occupancy/findByUserId";
import { createScan } from "@/server/repositories/scans/create";
import { findScanById } from "@/server/repositories/scans/findById";
import { validateRollNumber } from "@/lib/rollNumber";
import { auditWrite } from "@/server/services/audit/write";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/server/http/errors";

export interface RecordScanInput {
  roll?: string;
  personId?: string;
  direction: "IN" | "OUT";
  reason?: string;
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
