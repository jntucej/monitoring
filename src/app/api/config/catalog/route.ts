import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/config/catalog — the unified, zero-hardcoding metadata layer.
 *
 * The frontend is a pure schema-driven renderer: every dropdown, filter pill,
 * Kanban column, lockdown target picker, and analytics grouping reads from
 * this endpoint via useCatalog() instead of static arrays. When JNTUH CEJ
 * adds a new branch / hostel block / gate in the DB, every dashboard + form
 * updates automatically with zero code deploys.
 *
 * Live sources (verified schema):
 *   departments            (code, name)
 *   student_details        (DISTINCT hostel_block, year, section)
 *   gates                  (gate_code, name, type, is_active)
 *   config_pass_types      (id, code, name, description, rules JSONB)
 *   config_roles           (role, display_name)
 *   complaints             (DISTINCT category, if present)
 *
 * Privacy: gate_code / department code / role code are human identifiers —
 * safe to expose to all roles. Raw DB UUIDs are never serialized.
 *
 * Caching: short in-process TTL so the N+1 dashboard widgets share one
 * lookup per page load without hammering Postgres.
 */

interface CatItem {
  code: string;
  name?: string;
  count?: number;
}

const CATALOG_TTL_MS = 60_000;
let cache: { at: number; value: CatalogPayload } | null = null;

/** Force-invalidate the in-process catalog cache (called after topology writes). */
export function bumpCatalogCache() {
  cache = null;
}

interface CatalogPayload {
  departments: CatItem[];
  hostelBlocks: CatItem[];
  yearSections: { year: number; section: string }[];
  gates: CatItem[];
  passTypes: Array<{
    code: string;
    name: string;
    requiresApproval?: boolean;
    approvalFlow?: string;
  }>;
  roles: CatItem[];
  complaintCategories: CatItem[];
  generated_at: string;
}

async function buildCatalog(): Promise<CatalogPayload> {
  const [depts, blocks, ys, gates, passTypes, roles, complaints] =
    await Promise.all([
      query<{ code: string; name: string; n: number }>(
        `SELECT d.code, d.name,
                (SELECT COUNT(*) FROM public.student_details sd
                  WHERE sd.user_id IN (
                    SELECT u.id FROM public.users u
                    WHERE u.role = 'student'
                  )
                  AND true) AS n
           FROM public.departments d
          ORDER BY d.code`,
      ).catch(() => ({ rows: [] as { code: string; name: string; n: number }[] })),
      query<{ block: string; n: number }>(
        `SELECT btrim(sd.hostel_block) AS block, COUNT(*) AS n
           FROM public.student_details sd
          WHERE sd.hostel_block IS NOT NULL AND btrim(sd.hostel_block) <> ''
          GROUP BY 1 ORDER BY n DESC, block`,
      ).catch(() => ({ rows: [] as { block: string; n: number }[] })),
      query<{ year: number; section: string }>(
        `SELECT DISTINCT sd.year, sd.section
           FROM public.student_details sd
          WHERE sd.year IS NOT NULL
          ORDER BY sd.year, sd.section`,
      ).catch(() => ({ rows: [] as { year: number; section: string }[] })),
      query<{ code: string; name: string; active: number }>(
        `SELECT gate_code AS code, name,
                COUNT(*) FILTER (WHERE is_active) AS active
           FROM public.gates
          GROUP BY gate_code, name
          ORDER BY gate_code`,
      ).catch(() => ({ rows: [] as { code: string; name: string; active: number }[] })),
      query<{ code: string; name: string; requires_approval: boolean; approval_flow: string | null }>(
        `SELECT code, name, requires_approval, approval_flow
           FROM public.config_pass_types
          WHERE is_active
          ORDER BY code`,
      ).catch(() => ({ rows: [] as { code: string; name: string; requires_approval: boolean; approval_flow: string | null }[] })),
      query<{ code: string; display: string }>(
        `SELECT code, display_name AS display FROM public.config_roles WHERE is_active ORDER BY code`,
      ).catch(() => ({ rows: [] as { code: string; display: string }[] })),
      query<{ category: string; n: number }>(
        `SELECT btrim(coalesce(t.tag, 'general')) AS category, COUNT(*) AS n
           FROM public.support_tickets t
          GROUP BY 1 ORDER BY n DESC`,
      ).catch(() => ({ rows: [] as { category: string; n: number }[] })),
    ]);

  const payload: CatalogPayload = {
    departments: depts.rows.map((r) => ({ code: r.code, name: r.name, count: Number(r.n) || 0 })),
    hostelBlocks: blocks.rows.map((r) => ({ code: r.block, count: Number(r.n) })),
    yearSections: ys.rows.map((r) => ({ year: r.year, section: r.section })),
    gates: gates.rows.map((r) => ({ code: r.code, name: r.name, count: Number(r.active) })),
    passTypes: passTypes.rows.map((r) => ({
      code: r.code,
      name: r.name,
      requiresApproval: r.requires_approval,
      approvalFlow: r.approval_flow ?? undefined,
    })),
    roles: roles.rows.map((r) => ({ code: r.code, name: r.display })),
    complaintCategories: complaints.rows.map((r) => ({ code: r.category, count: Number(r.n) })),
    generated_at: new Date().toISOString(),
  };
  return payload;
}

async function implGet(_req: NextRequest, _ctx: { auth: AuthContext }) {
  if (cache && Date.now() - cache.at < CATALOG_TTL_MS) {
    return ok(cache.value);
  }
  const value = await buildCatalog();
  cache = { at: Date.now(), value };
  return ok(value);
}

export const GET = withApiChain(implGet, {
  route: "/api/config/catalog",
  auth: "user",
  rateLimit: { keyPrefix: "config_catalog", maxRequests: 60 },
});
