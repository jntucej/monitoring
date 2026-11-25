import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { publishNotification } from "@/lib/notifications/bus";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const operatorId = b?.operator_id ? String(b.operator_id).trim() : null;
  const title = String(b?.title ?? "").trim();
  const message = String(b?.message ?? "").trim();
  const priority = (["low", "normal", "high", "urgent"].includes(String(b?.priority))
    ? String(b.priority)
    : "high") as "low" | "normal" | "high" | "urgent";

  if (!title || !message) {
    return fail("INVALID_INPUT", "title and message are required", 400);
  }

  const scope = operatorId ? `user:${operatorId}` : "global";
  const res = await publishNotification({
    eventType: "security.supervisor.notice",
    actorId: auth.userId,
    actorRole: auth.role,
    scope,
    title,
    message,
    payload: { operator_id: operatorId },
    priority,
    channels: ["in_app"],
  });

  return ok({ notified: true, scope, result: res });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["supervisor", "principal", "admin", "sysadmin"],
});
