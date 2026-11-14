// src/app/api/admin/users/route.ts
// GET  /api/admin/users       — list users (admin/sysadmin only)
// POST /api/admin/users       — create user (admin/sysadmin only)
//
// Security:
//   - All reads via server-side Postgres pool, NOT Supabase client
//   - withAuthorization enforces requiredRole ['sysadmin','admin'] → 401 without valid JWT
//   - Sensitive columns (password_hash, pin_hash, totp_secret, thumbprint_hash) are
//     NEVER returned in any response
//   - RLS is FORCE-enabled on the users table as a defence-in-depth layer
//
// Rate limit: 60 req/min per IP (standard admin throttle)

import { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { randomUUID } from "crypto";

// ── Sensitive columns that must never leave the server ──────────────
const SENSITIVE_COLS = new Set([
  "password_hash",
  "initial_pin_hash",
  "pin_hash",
  "approval_password_hash",
  "totp_secret",
  "totp_secret_hash",
  "thumbprint_hash",
]);

// ── GET: List users ──────────────────────────────────────────────────
export const GET = withRateLimit(
  withAuthorization(
    async (_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> => {
      // Parse optional filters from query string
      const url = new URL(_req.url);
      const roleFilter = url.searchParams.get("role");
      const statusFilter = url.searchParams.get("status");
      const search = url.searchParams.get("q");
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
      const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10), 0);

      // Build safe query — only whitelist columns
      const selectCols = [
        "id", "unique_id", "name", "role", "email", "phone",
        "department_id", "status", "auth_provider", "created_at",
        "updated_at", "last_password_change", "mfa_required",
        "onboarded_at", "checked_out_at",
      ];
      const colList = selectCols.join(", ");

      let where = "";
      const params: unknown[] = [];
      const conditions: string[] = [];

      if (roleFilter) {
        params.push(roleFilter);
        conditions.push(`role = $${params.length}`);
      }
      if (statusFilter) {
        params.push(statusFilter);
        conditions.push(`status = $${params.length}`);
      }
      if (search) {
        params.push(`%${search}%`);
        conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
      }
      if (conditions.length > 0) {
        where = " WHERE " + conditions.join(" AND ");
      }

      // Count total (for pagination)
      const countRes = await query(
        `SELECT COUNT(*) as total FROM users${where}`,
        params
      );
      const total = Number(countRes.rows[0]?.total ?? 0);

      // Fetch page
      const dataRes = await query(
        `SELECT ${colList} FROM users${where} ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );

      // Scrub any sensitive columns that might have slipped in
      const users = dataRes.rows.map((row: Record<string, unknown>) => {
        const clean: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          if (!SENSITIVE_COLS.has(k)) {
            clean[k] = v;
          }
        }
        return clean;
      });

      return ok({
        users,
        total,
        limit,
        offset,
        hasMore: offset + users.length < total,
      });
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { windowMs: 60_000, maxRequests: 60 }
);

// ── POST: Create user ────────────────────────────────────────────────
export const POST = withRateLimit(
  withAuthorization(
    async (req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> => {
      let body: Record<string, unknown>;
      try {
        body = await req.json();
      } catch {
        return fail("INVALID_JSON", "Request body must be valid JSON", 400);
      }

      // Required fields
      const name = (body.name as string)?.trim();
      const role = (body.role as string)?.trim();
      const email = (body.email as string)?.trim().toLowerCase();

      if (!name || name.length < 2 || name.length > 200) {
        return fail("INVALID_NAME", "Name must be 2–200 characters", 422);
      }
      if (!role || !["student", "faculty", "staff", "operator", "admin", "sysadmin",
        "principal", "vice_principal", "hod", "guardian", "parent", "visitor",
        "worker", "supervisor", "hostel_manager", "mess_incharge", "emo",
        "exam_branch", "exam_superintendent", "deputy_warden", "oie", "caretaker",
      ].includes(role)) {
        return fail("INVALID_ROLE", `Role '${role}' is not a valid role`, 422);
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return fail("INVALID_EMAIL", "Valid email is required", 422);
      }

      const phone = (body.phone as string)?.trim() || null;
      const departmentId = (body.department_id as string)?.trim() || null;
      const status = (body.status as string) === "inactive" ? "inactive" : "active";

      // Check for duplicate email
      const dupRes = await query(
        "SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1",
        [email]
      );
      if (dupRes.rows.length > 0) {
        return fail("DUPLICATE_EMAIL", "A user with this email already exists", 409);
      }

      const newId = randomUUID();
      const uniqueId = (body.unique_id as string)?.trim() || String(Date.now());

      const insertRes = await query(
        `INSERT INTO users (id, unique_id, name, role, email, phone, department_id,
                            status, auth_provider, created_at, updated_at,
                            pin_must_change, password_must_change, failed_login_count,
                            session_version, bot_lang, bot_voice_replies,
                            dev_contact_enabled, is_kiosk_default,
                            approval_password_failed_count, mfa_required)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'password',
                 NOW(), NOW(), TRUE, TRUE, 0, 0, 'en', FALSE, FALSE, FALSE, 0, FALSE)
         RETURNING id, unique_id, name, role, email, phone, department_id,
                   status, auth_provider, created_at`,
        [newId, uniqueId, name, role, email, phone, departmentId, status]
      );

      const user = insertRes.rows[0];

      return ok(user, 201);
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { windowMs: 60_000, maxRequests: 20 }
);
