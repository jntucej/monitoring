// src/app/api/complaints/route.ts
// POST — raise a new complaint.
// GET  — list complaints (student = own, authority = role/department/hostel scoped).

import { NextRequest } from "next/server";
import { randomInt } from "node:crypto";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit, addNotification } from "@/lib/db";
import { routeComplaint } from "@/lib/complaint-routing";
import { canRaiseForScope } from "@/lib/student-rep";
import type { AuthContext } from "@/lib/authContext";

function generateComplaintNumber(): string {
  const y = new Date().getFullYear();
  return `CMP-${y}-${randomInt(100_000, 999_999 + 1)}`;
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const body = (await req.json().catch(() => ({}))) as {
    categoryCode?: string;
    title?: string;
    description?: string;
    location?: string;
    priority?: string;
    isAnonymous?: boolean;
    onBehalfOfScope?: string;
    onBehalfOfId?: string;
    girlsCell?: boolean;
  };

  const categoryCode = (body.categoryCode ?? "").trim();
  const title = (body.title ?? "").trim();
  const description = (body.description ?? "").trim();
  const location = body.location ? body.location.trim() : null;
  const priority = ["low", "medium", "high", "critical"].includes(body.priority ?? "")
    ? body.priority!
    : "medium";
  const isAnonymous = Boolean(body.isAnonymous);
  const girlsCell = Boolean(body.girlsCell);

  if (!categoryCode || !title || !description) {
    return fail("VALIDATION_ERROR", "categoryCode, title, and description are required", 400);
  }
  if (title.length > 200 || description.length > 5000) {
    return fail("VALIDATION_ERROR", "Title (max 200) or description (max 5000) too long", 422);
  }

  const route = await routeComplaint(categoryCode);
  if (!route) return fail("INVALID_CATEGORY", "Unknown complaint category", 400);

  if (isAnonymous && !route.anonymousAllowed) {
    return fail("ANONYMOUS_NOT_ALLOWED", "Anonymous submission is not allowed for this category", 422);
  }
  if (girlsCell && !route.girlsCellEligible) {
    return fail("GIRLS_CELL_NOT_APPLICABLE", "Girls grievance cell routing is not applicable here", 422);
  }

  // On-behalf-of check (student rep)
  if (body.onBehalfOfScope && body.onBehalfOfId) {
    const allowed = await canRaiseForScope(auth.userId, body.onBehalfOfScope, body.onBehalfOfId);
    if (!allowed) return fail("FORBIDDEN", "Not an active representative for this scope", 403);
  }

  const complaintNumber = generateComplaintNumber();
  const currentOwnerRole = girlsCell ? "principal" : route.primaryOwner;
  const slaDeadline = new Date(Date.now() + route.slaHours * 3_600_000).toISOString();

  const visibleToRoles = girlsCell
    ? ["principal", "sysadmin"]
    : Array.from(new Set([currentOwnerRole, ...route.chain.map((s) => s.role), "admin", "sysadmin"]));

  const { rows: inserted } = await query<{ id: string }>(
    `INSERT INTO public.complaints (
       complaint_number, category_code, title, description, location, priority,
       raised_by, is_anonymous, on_behalf_of_scope, on_behalf_of_id, girls_cell,
       current_owner_role, sla_deadline, visible_to_roles
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING id`,
    [
      complaintNumber,
      categoryCode,
      title,
      description,
      location,
      priority,
      isAnonymous ? null : auth.userId,
      isAnonymous,
      body.onBehalfOfScope ?? null,
      body.onBehalfOfId ?? null,
      girlsCell,
      currentOwnerRole,
      slaDeadline,
      visibleToRoles,
    ],
  );
  const complaintId = inserted[0].id;

  // Initial task
  await query(
    `INSERT INTO public.complaint_tasks (complaint_id, owner_role, action, status, due_at)
     VALUES ($1, $2, 'Acknowledge and investigate', 'pending', $3)`,
    [complaintId, currentOwnerRole, slaDeadline],
  );

  await addNotification(
    "role",
    currentOwnerRole,
    "complaint_created",
    `New Complaint: ${complaintNumber}`,
    `A new complaint (${route.label}) has been filed and assigned to your role queue.`,
  );
  if (girlsCell) {
    await addNotification(
      "role",
      "principal",
      "girls_cell_complaint",
      `Girls Cell Complaint: ${complaintNumber}`,
      `A sensitive complaint routed to the Girls Grievance Cell was filed.`,
    );
  }

  await addAudit({
    action: "COMPLAINT_CREATED",
    userId: auth.userId,
    role: auth.role,
    details: { complaintId, complaintNumber, categoryCode, currentOwnerRole },
  });

  return ok({
    complaintId,
    complaintNumber,
    currentOwnerRole,
    slaDeadline,
    visibleToRoles,
    chain: route.chain,
  });
}

const AUTHORITIES = new Set([
  "caretaker",
  "deputy_warden",
  "hostel_manager",
  "principal",
  "vice_principal",
  "hod",
  "exam_branch",
  "admin",
  "sysadmin",
  "supervisor",
  "emo",
  "mess_incharge",
]);

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const category = url.searchParams.get("category");
  const mine = url.searchParams.get("mine") === "true";
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? 100)));

  const isAuthority = AUTHORITIES.has(auth.role);
  const params: unknown[] = [];
  const where: string[] = [`c.deleted_at IS NULL`];

  if (mine || !isAuthority) {
    params.push(auth.userId);
    where.push(`c.raised_by = $${params.length}`);
  } else {
    // Authority sees complaints matching their role in visible_to_roles or current_owner_role
    params.push(auth.role);
    where.push(`(c.current_owner_role = $${params.length} OR $${params.length} = ANY(c.visible_to_roles))`);
  }

  if (status) {
    params.push(status);
    where.push(`c.status = $${params.length}`);
  }
  if (category) {
    params.push(category);
    where.push(`c.category_code = $${params.length}`);
  }

  params.push(limit);
  const sql = `
    SELECT c.id, c.complaint_number AS "complaintNumber", c.category_code AS "categoryCode",
           cc.label AS "categoryLabel", c.title, c.priority, c.status,
           c.current_owner_role AS "currentOwnerRole", c.sla_deadline AS "slaDeadline",
           c.created_at AS "createdAt", c.updated_at AS "updatedAt", c.is_anonymous AS "isAnonymous",
           CASE WHEN c.is_anonymous THEN NULL ELSE u.name END AS "raisedByName"
      FROM public.complaints c
      JOIN public.complaint_categories cc ON cc.code = c.category_code
      LEFT JOIN public.users u ON u.id = c.raised_by
     WHERE ${where.join(" AND ")}
     ORDER BY c.created_at DESC
     LIMIT $${params.length}`;

  const { rows } = await query(sql, params);
  return ok({ complaints: rows });
}

export const GET = withAuthorization(handleGet);
export const POST = withRateLimit(withAuthorization(handlePost), { windowMs: 60_000, maxRequests: 20 });
