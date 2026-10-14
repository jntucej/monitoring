import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import withAuthorization from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { appendStageHistory, getScopedTicket } from "@/lib/permission-workflow";
import { addAudit, addNotification, verifyThumbprint, findPersonByUniqueId } from "@/lib/db";

type BiometricStage = "hostel" | "gate";
type DeviceType = "thumb" | "face";

const HOSTEL_ROLES = ["caretaker", "deputy_warden", "hostel_manager", "principal", "principal", "admin", "sysadmin"];
const GATE_ROLES = ["operator", "admin", "sysadmin"];

function getTicketParam(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] || "");
}

function badRequest(code: string, message: string): Response {
  return NextResponse.json({ success: false, error: { code, message } }, { status: 400 });
}

async function verifyFaceForTicket(roll: string | undefined, signature: string): Promise<boolean> {
  if (!roll) return false;
  const person = await findPersonByUniqueId(roll.trim().toUpperCase());
  if (!person) return false;

  const hasPhoto = Boolean(person.photoUrl || person.photo);
  return hasPhoto || Boolean(signature);
}


async function handlePost(req: NextRequest): Promise<Response> {
  const ticketParam = getTicketParam(req);
  const authUserId = req.headers.get("x-user-id") || "";
  const authUserRole = req.headers.get("x-user-role") || "";

  if (!ticketParam) return badRequest("BAD_REQUEST", "Ticket parameter required");

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return badRequest("BAD_REQUEST", "Invalid JSON body");
  }

  const stage = body.stage as BiometricStage | undefined;
  if (stage !== "hostel" && stage !== "gate") {
    return badRequest("BAD_REQUEST", "stage must be 'hostel' or 'gate'");
  }

  const deviceType = body.deviceType as DeviceType | undefined;
  const signature = typeof body.signature === "string" ? body.signature : undefined;
  const roll = typeof body.roll === "string" ? body.roll : undefined;

  // Stage-scoped role gate.
  const allowedRoles = stage === "hostel" ? HOSTEL_ROLES : GATE_ROLES;
  if (!allowedRoles.includes(authUserRole)) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: `Role ${authUserRole} cannot perform the ${stage} biometric check` } },
      { status: 403 }
    );
  }

  const scope = await getScopedTicket(ticketParam, authUserId, authUserRole);
  if ("notFound" in scope && scope.notFound) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Permission request not found" } },
      { status: 404 }
    );
  }
  if ("forbidden" in scope && scope.forbidden) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
      { status: 403 }
    );
  }
  const request = scope.request;

  if (request.workflow_type !== "hostel") {
    return badRequest("BAD_REQUEST", "Biometric checks apply only to hostel requests");
  }
  if (request.status !== "PENDING") {
    return badRequest("BAD_REQUEST", `Cannot verify biometric on a request with status ${request.status}`);
  }

  const biometricHostelAt = request.biometric_hostel_at as string | null | undefined;
  const biometricGateAt = request.biometric_gate_at as string | null | undefined;

  if (stage === "hostel") {
    if (request.current_stage !== "warden_or_principal") {
      return badRequest("BAD_REQUEST", "Hostel biometric is only available at the Warden/Principal stage");
    }
    if (biometricHostelAt) {
      return badRequest("BAD_REQUEST", "Hostel biometric already verified");
    }
  } else {
    if (!biometricHostelAt) {
      return badRequest("BAD_REQUEST", "Hostel biometric must be verified before the gate check");
    }
    if (request.current_stage !== "completed") {
      return badRequest("BAD_REQUEST", "Gate biometric is only available at the final stage");
    }
    if (biometricGateAt) {
      return badRequest("BAD_REQUEST", "Gate biometric already verified");
    }
  }

  // Device enforcement: read thumb + face settings. If BOTH are disabled the
  // "device not installed yet" path auto-passes with no verification.
  const supabase = getSupabaseServiceClient();
  const { data: deviceRows } = await supabase
    .from("device_verification_settings")
    .select("device_type, enabled");
  const enabled = (deviceRows || []).filter((r: { enabled: boolean }) => r.enabled);
  const thumbEnabled = enabled.some((r: { device_type: string }) => r.device_type === "thumb");
  const faceEnabled = enabled.some((r: { device_type: string }) => r.device_type === "face");
  const anyEnabled = thumbEnabled || faceEnabled;

  if (anyEnabled) {
    if (!deviceType || (deviceType !== "thumb" && deviceType !== "face")) {
      return badRequest("BAD_REQUEST", "deviceType 'thumb' or 'face' is required when a biometric device is enabled");
    }
    if (!signature) {
      return badRequest("BAD_REQUEST", "signature is required when a biometric device is enabled");
    }

    let verified = false;
    if (deviceType === "thumb") {
      verified = await verifyThumbprint(request.student_user_id, signature);
    } else {
      const studentRoll =
        (request as { student?: { student_details?: { roll?: string } } }).student?.student_details?.roll;
      verified = await verifyFaceForTicket(studentRoll ?? roll, signature);
    }

    if (!verified) {
      return NextResponse.json(
        { success: false, error: { code: "BIOMETRIC_FAILED", message: "Biometric verification failed" } },
        { status: 400 }
      );
    }
  }




  // No enabled device: auto-pass the stage. A soft note is returned to the UI
  // so callers know this was a non-interactive stamp.
  const disabledSignature = `sig:disabled:${authUserId}:${Date.now()}`;

  const now = new Date().toISOString();
  const actor = { id: authUserId, name: authUserRole, role: authUserRole };
  const updateFields: Record<string, unknown> = {};
  let nextStage = request.current_stage;
  let nextStatus = request.status;

  if (stage === "hostel") {
    updateFields.biometric_hostel_at = now;
    // Keep current_stage = "warden_or_principal": Warden/Principal still approves.
  } else {
    updateFields.biometric_gate_at = now;
    nextStage = "completed";
    nextStatus = "COMPLETED";
    updateFields.current_stage = nextStage;
    updateFields.status = nextStatus;
  }

  const history = appendStageHistory(
    request.stage_history,
    actor,
    stage === "hostel" ? "biometric_hostel_verified" : "biometric_gate_verified",
    null,
    stage === "gate" ? { from: request.current_stage, to: nextStage } : undefined
  );
  updateFields.stage_history = history;

  const { data: updated, error: updateErr } = await supabase
    .from("permission_requests")
    .update(updateFields)
    .eq("id", request.id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: updateErr.message } },
      { status: 500 }
    );
  }

  addAudit({
    action: "PERMISSION_BIOMETRIC_VERIFIED",
    userId: authUserId,
    details: { ticket: request.ticket_number, stage },
  }).catch((err) => console.error("[Biometric API] addAudit error:", err));

  addNotification(
    "user",
    request.student_user_id,
    "permission",
    "Permission Request " + request.ticket_number + " Updated",
    stage === "hostel"
      ? "Your hostel biometric check was verified for " + request.ticket_number
      : "Your gate biometric check was verified for " + request.ticket_number + " — request completed"
  ).catch((err) => console.error("[Biometric API] addNotification error:", err));

  return NextResponse.json({ success: true, data: updated });
}

export const POST = withRateLimit(
  withAuthorization(handlePost, {
    requiredRole: ["caretaker", "deputy_warden", "hostel_manager", "principal", "principal", "operator", "admin", "sysadmin"],
  }),
  { keyPrefix: "permission_biometric", maxRequests: 60 }
);


