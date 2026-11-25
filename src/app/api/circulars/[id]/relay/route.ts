import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const circularId = parts[parts.length - 2];
  const b = await req.json().catch(() => null);
  const relayChain = b?.relay_chain === "operational" ? "operational" : "academic";
  const targetLabel = String(b?.target_label ?? "").trim();
  const notes = b?.notes ? String(b.notes).trim() : null;

  if (!targetLabel) {
    return fail("INVALID_INPUT", "target_label (e.g. CSE-3A, Lab 1 Prep) is required", 400);
  }

  const { rows } = await query(
    `INSERT INTO public.circular_relays
       (circular_id, relayed_by, relayed_by_role, relay_chain, target_label, notes)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)
     RETURNING *`,
    [circularId, auth.userId, auth.role, relayChain, targetLabel, notes],
  );

  await addAudit({
    action: "CIRCULAR_RELAYED",
    userId: auth.userId,
    role: auth.role,
    details: { circularId, relayChain, targetLabel },
  }).catch(() => {});

  return ok(rows[0], 201);
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["faculty", "hod", "staff", "hostel_manager", "admin", "sysadmin"],
});
