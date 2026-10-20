import { NextRequest, NextResponse } from "next/server";
import { assertCsrf } from "@/lib/csrf";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import withAuthorization from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { appendStageHistory, getScopedTicket } from "@/lib/permission-workflow";
import { addAudit, addNotification, verifyThumbprint, findPersonByUniqueId } from "@/lib/db";

type BiometricStage = "hostel" | "gate";
type DeviceType = "thumb" | "face";

function getTicketParam(req: NextRequest): string {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("permissions");
  return idx >= 0 ? parts[idx + 1] ?? "" : "";
}

function badRequest(code: string, message: string): Response {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status: 400 },
  );
}

async function verifyFaceForTicket(roll: string | undefined, signature: string): Promise<boolean> {
  if (!roll || !signature) return false;
  const person = await findPersonByUniqueId(roll);
  if (!person?.photoUrl) return false;
  try {
    const { matchFace } = await import("@/lib/face-match");
    const r = await matchFace(person.photoUrl, signature);
    return r.match && r.score >= 0.7;
  } catch {
    return false;
  }
}

async function handlePost(req: NextRequest): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const body = await req.json().catch(() => ({}));
  const stage = body.stage as BiometricStage | undefined;
  const device = (body.device as DeviceType | undefined) ?? "thumb";
  const signature = body.signature as string | undefined;
  if (!stage || !["hostel", "gate"].includes(stage)) {
    return badRequest("INVALID_STAGE", "stage must be 'hostel' or 'gate'");
  }
  if (!signature) return badRequest("MISSING_SIGNATURE", "signature is required");
  const ticket = getTicketParam(req);
  const scoped = await getScopedTicket(ticket, "", "");
  if ("notFound" in scoped) {
    return NextResponse.json({ success: false, error: { code: "TICKET_NOT_FOUND", message: "Ticket not found" } }, { status: 404 });
  }
  if ("forbidden" in scoped) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Not allowed" } }, { status: 403 });
  }
  const row = scoped.request;
  const studentRoll = (row as any).student?.student_details?.roll as string | undefined;
  let verified = false;
  if (device === "thumb" && studentRoll) {
    const person = await findPersonByUniqueId(studentRoll);
    verified = person ? await verifyThumbprint(person.id, signature) : false;
  } else if (device === "face") {
    verified = await verifyFaceForTicket(studentRoll, signature);
  }
  if (!verified) {
    await addAudit({
      action: "PERMISSION_BIOMETRIC_VERIFIED",
      userId: row.id,
      details: JSON.stringify({ ticket, stage, device, verified: false }),
    });
    return NextResponse.json(
      { success: false, error: { code: "BIOMETRIC_MISMATCH", message: "Biometric verification failed" } },
      { status: 400 },
    );
  }
  const supabase = getSupabaseServiceClient();
  const nowIso = new Date().toISOString();
  const column = stage === "hostel" ? "biometric_hostel_at" : "biometric_gate_at";
  const { error: updErr } = await supabase
    .from("permissions")
    .update({
      [column]: nowIso,
      stage_history: appendStageHistory(
        (row as any).stage_history,
        { id: "system", name: "biometric", role: "system" },
        `BIOMETRIC_${stage.toUpperCase()}`,
        `device=${device}`,
      ),
    })
    .eq("id", row.id);
  if (updErr) {
    return NextResponse.json(
      { success: false, error: { code: "DB_ERROR", message: updErr.message } },
      { status: 500 },
    );
  }
  await addAudit({
    action: "PERMISSION_BIOMETRIC_VERIFIED",
    userId: row.id,
    details: JSON.stringify({ ticket, stage, device, verified: true }),
  });
  await addNotification(
    "user",
    (row as any).student_user_id ?? (row as any).requester_user_id,
    "permission",
    "Biometric Verified",
    `${stage} biometric verified for ticket ${ticket}`,
  );
  return NextResponse.json({
    success: true,
    data: { ticket, stage, device, verifiedAt: nowIso },
  });
}

export const POST = withRateLimit(withAuthorization(handlePost), {
  windowMs: 60_000,
  maxRequests: 30,
});
