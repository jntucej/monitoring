// src/app/api/admin/steward/circulars/issue-or-recall/route.ts
// POST /api/admin/steward/circulars/issue-or-recall
//
// Issue an office circular (validated via SchemaFormDrawer) or trigger
// full Recall Cascade (tombstone_at + SUPERSEDED + draft cancellation).
//
// auth: ['admin'] only.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

export const POST = withAuthorization(async (req: NextRequest, { auth }: { auth: AuthContext }) => {
  if (!["admin"].includes(auth.role)) {
    return fail("FORBIDDEN", "ADMIN only", 403);
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: "issue" | "recall";
    circularId?: string;
    title?: string;
    circularNo?: string;
    summary?: string;
    classifiedTargets?: Record<string, unknown>;
  };

  if (body.action === "issue") {
    if (!body.title || !body.circularNo) {
      return fail("VALIDATION", "title + circularNo required");
    }

    // Check for duplicate circular_no
    const dup = await query(
      `SELECT id FROM circular_requests WHERE circular_no = $1 AND withdrawn_at IS NULL LIMIT 1`,
      [body.circularNo],
    );
    if (dup.rows.length > 0) {
      return fail("DUPLICATE", `Circular ${body.circularNo} already exists`, 409, { existingId: dup.rows[0].id });
    }

    const result = await query(
      `INSERT INTO circular_requests
         (title, circular_no, issued_by, status, summary, classified_targets, requested_by)
       VALUES ($1, $2, 'ADMIN', 'PUBLISHED', $3, $4, $5)
       RETURNING id, status, created_at`,
      [
        body.title,
        body.circularNo,
        body.summary ?? null,
        body.classifiedTargets ? JSON.stringify(body.classifiedTargets) : null,
        auth.userId,
      ],
    );

    // Emit to domain_outbox
    await query(
      `INSERT INTO domain_outbox (event_type, payload, status)
       VALUES ($1, $2, 'PENDING')`,
      [
        "CIRCULAR_ISSUED",
        JSON.stringify({
          circularId: result.rows[0].id,
          circularNo: body.circularNo,
          issuedBy: auth.userId,
        }),
      ],
    );

    await addAudit({
      action: "circular_issued",
      userId: auth.userId,
      role: "admin",
      details: { circularNo: body.circularNo, circularId: result.rows[0].id },
    });

    return ok({
      issued: true,
      circularId: result.rows[0].id,
      circularNo: body.circularNo,
    });
  }

  if (body.action === "recall") {
    if (!body.circularId) {
      return fail("VALIDATION", "circularId required");
    }

    // 1. Mark the circular as RECALLED
    const result = await query(
      `UPDATE circular_requests
          SET status = 'RECALLED',
              withdrawn_at = NOW()
        WHERE id = $1 AND status = 'PUBLISHED'
        RETURNING id, status, withdrawn_at`,
      [body.circularId],
    );

    if (result.rows.length === 0) {
      return fail("NOT_FOUND", "Active circular not found or already recalled", 404);
    }

    // 2. Stamp SUPERSEDED on linked RAG chunks (knowledge_chunks)
    await query(
      `UPDATE knowledge_chunks
          SET tombstone_at = NOW()
        WHERE source_ref = $1 AND tombstone_at IS NULL`,
      [`circular:${body.circularId}`],
    );

    // 3. Cancel pending draft actions linked to this circular
    await query(
      `UPDATE operational_announcements
          SET state = 'CANCELLED'
        WHERE content_payload->>'circularRef' = $1 AND state = 'DRAFT'`,
      [body.circularId],
    );

    // 4. Emit to domain_outbox
    await query(
      `INSERT INTO domain_outbox (event_type, payload, status)
       VALUES ($1, $2, 'PENDING')`,
      [
        "CIRCULAR_RECALLED",
        JSON.stringify({
          circularId: body.circularId,
          recalledBy: auth.userId,
          timestamp: new Date().toISOString(),
        }),
      ],
    );

    await addAudit({
      action: "circular_recalled",
      userId: auth.userId,
      role: "admin",
      details: { circularId: body.circularId },
    });

    return ok({
      recalled: true,
      circularId: body.circularId,
      note: "Circular marked RECALLED, RAG chunks tombstoned, draft actions cancelled.",
    });
  }

  return fail("VALIDATION", "action must be 'issue' or 'recall'");
}, { requiredRole: ["admin"] });
