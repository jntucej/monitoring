/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addAudit, addNotification, verifyThumbprint } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import {
  applyPermissionAction,
  PermissionRuleError,
  type RequestSnapshot,
  type PermissionAction,
} from "@/lib/permission-workflow";
import { getDeviceSetting } from "@/lib/device-settings";
import { computeSignatureHash, fetchDocumentBytes } from "@/lib/document-signature";
import type { Role } from "@/lib/types";

function badRequest(message: string) {
  return NextResponse.json(
    { success: false, error: { code: "BAD_REQUEST", message } },
    { status: 400 },
  );
}

function forbidden(message: string) {
  return NextResponse.json(
    { success: false, error: { code: "FORBIDDEN", message } },
    { status: 403 },
  );
}

function notFound(message: string) {
  return NextResponse.json(
    { success: false, error: { code: "NOT_FOUND", message } },
    { status: 404 },
  );
}

function serverError(message: string) {
  return NextResponse.json(
    { success: false, error: { code: "SERVER_ERROR", message } },
    { status: 500 },
  );
}

function getTicketFromReq(req: NextRequest, context?: any): string {
  if (context?.params?.ticket) return context.params.ticket;
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segs[segs.length - 1] || "");
}

async function getHandler(req: NextRequest, context: any) {
  const ticket = getTicketFromReq(req, context);
  if (!ticket) return badRequest("Ticket parameter required");

  const db = getSupabaseServiceClient();
  const isUuid = /^[0-9a-f-]{36}$/i.test(ticket);
  const lookup = isUuid
    ? db.from("permission_requests").select("*").or(`id.eq.${ticket},ticket_number.eq.${ticket}`)
    : db.from("permission_requests").select("*").eq("ticket_number", ticket);

  const { data, error } = await lookup.single();
  if (error || !data) return notFound("Permission request not found");

  return NextResponse.json({ success: true, data });
}

async function handlePatch(req: NextRequest, context?: any): Promise<Response> {
  const ticketParam = getTicketFromReq(req, context);
  const authUserId = req.headers.get("x-user-id") || context?.auth?.userId || "";
  const authUserRole = req.headers.get("x-user-role") || context?.auth?.role || "";
  const authUserEmail = req.headers.get("x-user-email") || context?.auth?.email || "";

  if (!ticketParam) return badRequest("Ticket parameter required");

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const rawAction = typeof body.action === "string" ? body.action.toUpperCase() : undefined;
  const action = rawAction as PermissionAction | undefined;
  const comment = (body.comment as string | undefined) ?? undefined;
  const targetStage = body.targetStage as string | undefined;

  const VALID: PermissionAction[] = [
    "APPROVE",
    "FORWARD",
    "REJECT",
    "ESCALATE",
    "REQUEST_INFO",
    "COMPLETE",
    "SIGN",
    "BIOMETRIC_HOSTEL",
    "BIOMETRIC_GATE",
  ];

  if (!action || !VALID.includes(action)) {
    return badRequest(`Invalid or missing action. Must be one of: ${VALID.join(", ")}`);
  }

  const supabase = getSupabaseServiceClient();

  // ── 1. Load request ──────────────────────────────────────────────
  const isUuid = /^[0-9a-f-]{36}$/i.test(ticketParam);
  const lookup = isUuid
    ? supabase.from("permission_requests").select("*").or(`id.eq.${ticketParam},ticket_number.eq.${ticketParam}`)
    : supabase.from("permission_requests").select("*").eq("ticket_number", ticketParam);
  const { data: request, error: fetchErr } = await lookup.single();
  if (fetchErr || !request) return notFound("Permission request not found");

  const snapshot: RequestSnapshot = {
    id: request.id,
    ticket_number: request.ticket_number,
    workflow_type: request.workflow_type,
    current_stage: request.current_stage,
    status: request.status,
    hostel_scope: request.hostel_scope ?? null,
    student_user_id: request.student_user_id || request.user_id,
    stage_history: Array.isArray(request.stage_history) ? request.stage_history : [],
    document_required: Boolean(request.document_required),
    document_url: request.document_url ?? null,
    biometric_hostel_at: request.biometric_hostel_at ?? null,
    biometric_gate_at: request.biometric_gate_at ?? null,
    digital_signature: request.digital_signature ?? null,
  };

  // ── 2. Scope check (hostel_scope) ────────────────────────────────
  if (
    snapshot.workflow_type === "hostel" &&
    ["caretaker", "deputy_warden", "hostel_manager"].includes(authUserRole)
  ) {
    const { data: user } = await supabase
      .from("users")
      .select("hostel_scope")
      .eq("id", authUserId)
      .single();
    if (user?.hostel_scope && ["boys", "girls"].includes(user.hostel_scope)) {
      if (snapshot.hostel_scope && snapshot.hostel_scope !== user.hostel_scope) {
        return forbidden(`Cannot act on ${snapshot.hostel_scope} hostel request`);
      }
    }
  }

  // ── 3. Evidence acquisition (biometric / signature) ──────────────
  let evidencePayload: { signatureHash?: string; deviceDisabled?: boolean } | undefined;

  if (action === "BIOMETRIC_HOSTEL" || action === "BIOMETRIC_GATE") {
    const stage = action === "BIOMETRIC_HOSTEL" ? "hostel" : "gate";
    const device = await getDeviceSetting(stage);
    if (device.enabled) {
      const biometricSignature = body.biometricSignature as string | undefined;
      if (!biometricSignature) {
        return badRequest("Biometric signature required (device enabled)");
      }
      const ok = await verifyThumbprint(snapshot.student_user_id, biometricSignature);
      if (!ok) return badRequest("Biometric verification failed");
      evidencePayload = {};
    } else {
      evidencePayload = { deviceDisabled: true };
    }
  }

  if (action === "SIGN") {
    if (!snapshot.document_url) {
      return badRequest("No document to sign");
    }
    // I6: bind signature to bytes + ticket + signer + timestamp
    const bytes = await fetchDocumentBytes(snapshot.document_url);
    const signatureHash = await computeSignatureHash({
      documentBytes: bytes,
      ticketNumber: snapshot.ticket_number,
      signerId: authUserId,
      timestampMs: Date.now(),
    });
    evidencePayload = { signatureHash };
  }

  // ── 4. Delegate to pure engine ───────────────────────────────────
  let decision;
  try {
    decision = applyPermissionAction(
      snapshot,
      { id: authUserId, name: authUserEmail || authUserId, role: authUserRole },
      { action, comment, targetStage, evidencePayload },
    );
  } catch (e) {
    if (e instanceof PermissionRuleError) {
      return NextResponse.json(
        { success: false, error: { code: e.code, message: e.message } },
        { status: e.code === "FORBIDDEN_STAGE" ? 403 : 400 },
      );
    }
    throw e;
  }

  // ── 5. Persist ───────────────────────────────────────────────────
  const { data: updated, error: updateErr } = await supabase
    .from("permission_requests")
    .update({ ...decision.updates, updated_at: new Date().toISOString() })
    .eq("id", snapshot.id)
    .select()
    .single();
  if (updateErr) return serverError(updateErr.message);

  // ── 6. Side effects (audit, notification, signature row) ─────────
  await addAudit({
    action: decision.effects.auditAction,
    userId: authUserId,
    userName: authUserEmail,
    role: authUserRole as Role,
    details: {
      ticketNumber: snapshot.ticket_number,
      action,
      fromStage: snapshot.current_stage,
      toStage: decision.updates.current_stage,
      status: decision.updates.status,
      comment,
    },
  });

  if (decision.effects.notifyUserId && decision.effects.notifyMessage) {
    await addNotification(
      "user",
      decision.effects.notifyUserId,
      "permission",
      `Ticket ${snapshot.ticket_number} updated`,
      decision.effects.notifyMessage,
    );
  }

  if (decision.effects.signPayload) {
    await supabase.from("document_signatures").insert({
      document_id: snapshot.id,
      signed_by: authUserId,
      signature_hash: decision.effects.signPayload.signatureHash,
    });
  }

  return NextResponse.json({ success: true, data: updated });
}

export const GET = withRateLimit(
  withAuthorization(getHandler),
  { keyPrefix: "perm_tic_get", maxRequests: 50 },
);

export const PATCH = withRateLimit(
  withAuthorization(handlePatch, {
    requiredRole: [
      "caretaker",
      "deputy_warden",
      "hostel_manager",
      "warden",
      "principal",
      "faculty",
      "hod",
      "oie",
      "vice_principal",
      "operator",
      "admin",
      "sysadmin",
    ],
  }),
  { keyPrefix: "perm_tic_patch", maxRequests: 20 },
);
