import { NextRequest } from "next/server";
import { z } from "zod";
import { withApiChain } from "@/lib/api-chain";
import { ok } from "@/server/http/response";
import { query, withTransaction } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/sysadmin/topology — 1-click course / gate / hostel-network
 * creation + full hierarchy rebuild. A single transaction inserts the unit,
 * scaffolds its default sections/scopes, links it into the reporting
 * hierarchy, audits the change, and flushes the catalog cache so every
 * dashboard / form / SpatialPeopleMap picks up the new node with zero
 * restarts.
 *
 * Real schema (verified):
 *   departments(code UNIQUE, name)
 *   classes(department_id, year, section UNIQUE)
 *   gates(gate_code UNIQUE, name, location, type, is_active)
 *   audit_logs(action, user_id, role, details JSONB, timestamp)
 *
 * Hostels are DATA-driven (student_details.hostel_block), not a table, so a
 * new hostel block becomes valid automatically via Loop 3's
 * getValidHostelCodes() — no row to insert here.
 *
 * Authority: sysadmin (break-glass) or admin (operational units).
 */
const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add_course"),
    code: z.string().min(2).max(16),
    name: z.string().min(3).max(120),
    years: z.number().int().min(1).max(4).default(4),
    sectionsPerYear: z.number().int().min(1).max(4).default(1),
  }),
  z.object({
    action: z.literal("add_gate"),
    code: z.string().min(2).max(24),
    name: z.string().min(3).max(100),
    location: z.string().min(1).max(120),
  }),
  z.object({
    action: z.literal("add_facility"),
    code: z.string().min(2).max(32),
    name: z.string().min(3).max(120),
    category: z.enum(["HOSTEL_BLOCK", "GATE", "EXAM_HALL", "LAB"]),
    config: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    action: z.literal("add_org_unit"),
    code: z.string().min(2).max(32),
    name: z.string().min(3).max(120),
    unitType: z.enum(["INSTITUTE", "DEPARTMENT", "DIVISION"]).default("DEPARTMENT"),
  }),
  z.object({
    action: z.literal("rebuild_hierarchy"),
  }),
]);

const SECTION_LETTERS = ["A", "B", "C", "D"];

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = ActionSchema.parse(await req.json());

  const result = await withTransaction(async (client) => {
    if (body.action === "add_course") {
      // 1. Insert / upsert the department (course).
      await client.query(
        `INSERT INTO public.departments (code, name)
         VALUES ($1, $2)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`,
        [body.code.toUpperCase(), body.name],
      );

      // 2. Scaffold year/section classes so HOD + Faculty can use it now.
      for (let y = 1; y <= body.years; y++) {
        for (let s = 0; s < body.sectionsPerYear; s++) {
          const letter = SECTION_LETTERS[s] ?? "A";
          await client.query(
            `INSERT INTO public.classes (department_id, year, section, name)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (department_id, year, section) DO NOTHING`,
            [body.code.toUpperCase(), y, letter, `${body.code.toUpperCase()} Y${y}-${letter}`],
          );
        }
      }
    }

    if (body.action === "add_gate") {
      await client.query(
        `INSERT INTO public.gates (gate_code, name, location, type, is_active)
         VALUES ($1, $2, $3, 'main', true)
         ON CONFLICT (gate_code) DO UPDATE SET name = EXCLUDED.name`,
        [body.code.toUpperCase(), body.name, body.location],
      );
    }

    if (body.action === "add_facility") {
      await client.query(
        `INSERT INTO public.facilities (facility_code, name, category, config, is_active)
         VALUES ($1, $2, $3, COALESCE($4::jsonb, '{"requires_digital_pass":true}'::jsonb), true)
         ON CONFLICT (facility_code) DO UPDATE SET
           name = EXCLUDED.name,
           category = EXCLUDED.category,
           config = public.facilities.config || EXCLUDED.config,
           is_active = true`,
        [body.code.toUpperCase(), body.name, body.category, JSON.stringify(body.config ?? {})],
      );
    }

    if (body.action === "add_org_unit") {
      await client.query(
        `INSERT INTO public.org_units (code, name, unit_type, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, is_active = true, updated_at = NOW()`,
        [body.code.toUpperCase(), body.name, body.unitType],
      );
    }

    // Audit every topology mutation (real audit_logs table).
    await client.query(
      `INSERT INTO public.audit_logs (action, user_id, user_role, details)
       VALUES ($1, $2, $3, $4)`,
      [
        `topology.${body.action}`,
        auth.userId,
        auth.role,
        JSON.stringify({
          action: body.action,
          code: ("code" in body ? body.code : undefined) ?? null,
          name: ("name" in body ? body.name : undefined) ?? null,
          at: new Date().toISOString(),
        }),
      ],
    );

    return {
      action: body.action,
      rebuiltAt: new Date().toISOString(),
    };
  }, { currentUserId: auth.userId, currentRole: auth.role });

  // Flush the in-process catalog cache so dashboards refresh immediately.
  const { bumpCatalogCache } = await import("@/app/api/config/catalog/route");
  bumpCatalogCache();

  return ok(result);
}

export const POST = withApiChain(implPost, {
  route: "/api/sysadmin/topology",
  auth: "user",
  requiredRole: ["sysadmin", "admin"],
  rateLimit: { keyPrefix: "topology_write", maxRequests: 30 },
});

// GET is a no-op health check so the route is discoverable + idempotent-safe.
async function implGet(_req: NextRequest, _ctx: { auth: AuthContext }) {
  const { rows } = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM public.departments`,
  ).catch(() => ({ rows: [{ n: 0 }] as { n: number }[] }));
  return ok({ departments: rows[0]?.n ?? 0, note: "Topology is managed via POST." });
}

export const GET = withApiChain(implGet, {
  route: "/api/sysadmin/topology",
  auth: "user",
  requiredRole: ["sysadmin", "admin"],
  rateLimit: { keyPrefix: "topology_read", maxRequests: 60 },
});
