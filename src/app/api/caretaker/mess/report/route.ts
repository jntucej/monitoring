import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { publishNotification } from "@/lib/notifications/bus";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const location = String(body?.location ?? "Mess Hall").trim();
  const priority = String(body?.priority ?? "normal").trim();

  if (!title || !description) {
    return fail("INVALID_INPUT", "title and description are required", 400);
  }

  const complaintNumber = `MESS-${Date.now().toString(36).toUpperCase()}`;
  const { rows } = await query<{ id: string; complaint_number: string }>(
    `INSERT INTO public.complaints
       (complaint_number, category_code, title, description, location, priority,
        raised_by, status, current_owner_role)
     VALUES ($1, 'mess', $2, $3, $4, $5, $6::uuid, 'OPEN', 'mess_incharge')
     RETURNING id, complaint_number`,
    [complaintNumber, title, description, location, priority, auth.userId],
  );

  await addAudit({
    action: "CARETAKER_MESS_ISSUE_REPORTED",
    userId: auth.userId,
    role: auth.role,
    details: { complaintId: rows[0].id, complaintNumber: rows[0].complaint_number },
  });

  await publishNotification({
    eventType: "mess.issue.reported",
    actorId: auth.userId,
    actorRole: auth.role,
    scope: "mess",
    title: `Mess issue: ${title}`,
    message: description,
    payload: { complaint_id: rows[0].id, complaint_number: rows[0].complaint_number },
    priority: "high",
    channels: ["in_app"],
  }).catch(() => {});

  return ok(rows[0], 201);
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["caretaker", "hostel_manager", "admin", "sysadmin"],
});
