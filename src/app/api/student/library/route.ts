// /api/student/library/route.ts
// Issue/return history, overdue books, outstanding fines (STEP 3.1).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function implGet(_req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const { rows } = await query<{
    book_id: string; title: string; author: string | null;
    issued_at: string; due_at: string | null; returned_at: string | null;
    fine: string; status: string;
  }>(
    `SELECT li.book_id, lb.title, lb.author, li.issued_at, li.due_at,
            li.returned_at, li.fine::text AS fine, li.status
       FROM public.library_issues li
       JOIN public.library_books lb ON lb.id = li.book_id
      WHERE li.student_id = $1
      ORDER BY li.issued_at DESC`,
    [auth.userId],
  );
  const totalFines = rows.reduce((s, r) => s + Number(r.fine || 0), 0);
  return ok({
    userId: auth.userId,
    totalOutstandingFines: totalFines,
    issues: rows.map((r) => ({
      bookId: r.book_id, title: r.title, author: r.author,
      issuedAt: r.issued_at, dueAt: r.due_at, returnedAt: r.returned_at,
      fine: Number(r.fine || 0), status: r.status,
    })),
  });
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: ["student", "admin", "sysadmin"] }),
  { keyPrefix: "student-library", maxRequests: 30, windowMs: 60_000 },
);
