import { NextRequest } from "next/server";
import { z } from "zod";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query, withTransaction } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";
import { bumpCatalogCache } from "@/app/api/config/catalog/route";

/**
 * POST /api/sysadmin/regulation/clone — dry-run-verify + clone a regulation.
 *
 * The meta-rule requires that modifying governance_matrix (including the
 * publish path for new regulation codes) is two-person: the caller must
 * supply a `secondApproverId` that is (a) a real user, (b) a different role
 * than the caller, and (c) either `principal` or `sysadmin`.
 *
 * The clone creates a DRAFT row with `version+1` of the target regulation,
 * copies its program_code, and leaves it in DRAFT until the governance
 * console publishes it (Draft -> Linter -> Dry-Run -> Two-Person -> Publish).
 */

const CloneBody = z.object({
  sourceCode: z.string().min(2).max(32),
  newCode: z.string().min(2).max(32),
  secondApproverId: z.string().uuid(),
  dryRunSummary: z.record(z.string(), z.unknown()),
});

async function implPost(req: NextRequest, ctx: ApiChainContext<unknown, AuthContext>) {
  const { auth } = ctx;
  const body = CloneBody.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return fail("VALIDATION", body.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), 400);
  }
  const { sourceCode, newCode, secondApproverId, dryRunSummary } = body.data;

  // Source regulation must exist.
  const src = await query<{ id: string; code: string; program_code: string; version: number }>(
    `SELECT id, code, program_code, version
       FROM public.academic_regulations
      WHERE code = $1 AND is_active LIMIT 1`,
    [sourceCode],
  ).catch(() => ({ rows: [] as { id: string; code: string; program_code: string; version: number }[] }));
  if (src.rows.length === 0) {
    return fail("NOT_FOUND", `Source regulation "${sourceCode}" not found or not active`, 404);
  }

  // New code must not already exist.
  const exists = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM public.academic_regulations WHERE code = $1`,
    [newCode],
  ).catch(() => ({ rows: [] as { n: number }[] }));
  if ((exists.rows[0]?.n ?? 0) > 0) {
    return fail("ALREADY_EXISTS", `Regulation code "${newCode}" already exists`, 409);
  }

  // Two-person check: the second approver must be a real user with an
  // eligible role (principal / sysadmin) AND differ from the caller.
  const second = await query<{ role: string; name: string | null }>(
    `SELECT u.role, u.name FROM public.users u WHERE u.id = $1 LIMIT 1`,
    [secondApproverId],
  ).catch(() => ({ rows: [] as { role: string; name: string | null }[] }));
  if (second.rows.length === 0) {
    return fail("TWO_PERSON_REQUIRED", "Second approver user not found", 409);
  }
  if (!["principal", "sysadmin"].includes(second.rows[0].role)) {
    return fail(
      "TWO_PERSON_ROLE_INVALID",
      `Second approver must be principal or sysadmin (got "${second.rows[0].role}")`,
      409,
    );
  }
  if (secondApproverId === auth.userId) {
    return fail("TWO_PERSON_REQUIRED", "Self-approval is blocked", 409);
  }

  // The DRAFT clone row.
  let clonedId = "";
  try {
    await withTransaction(
      async (client) => {
        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO public.academic_regulations
             (code, program_code, version, is_active, status, effective_from, description)
           VALUES
             ($1, $2, $3, false, 'DRAFT', NOW(), $4)
           RETURNING id`,
          [
            newCode,
            src.rows[0].program_code,
            src.rows[0].version + 1,
            `Cloned from ${sourceCode} v${src.rows[0].version} — ${src.rows[0].code} blueprint.`,
          ],
        );
        if (rows.length === 0) throw new Error("clone insert returned no row");
        clonedId = rows[0].id;
      },
      { currentUserId: auth.userId, currentRole: auth.role },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return fail("CLONE_FAILED", msg, 500);
  }

  bumpCatalogCache();

  await recordMutationAudit({
    actorId: auth.userId,
    roleContext: auth.role,
    action: "regulation_clone",
    resource: "academic_regulations",
    resourceId: newCode,
    afterState: {
      sourceCode,
      newCode,
      version: src.rows[0].version + 1,
      status: "DRAFT",
      dryRun: Boolean(dryRunSummary),
      secondApproverId,
    },
  });

  return ok({
    sourceCode,
    newCode,
    clonedId,
    status: "DRAFT",
    version: src.rows[0].version + 1,
    secondApproverId,
    note: "Clone is DRAFT. Publish via the Policy Console (Draft -> Linter -> Dry-Run -> Two-Person -> Publish).",
  });
}

export const POST = withApiChain(implPost, {
  route: "/api/sysadmin/regulation/clone",
  auth: "user",
  requiredRole: ["sysadmin", "admin", "principal", "oie"],
  rateLimit: { keyPrefix: "regulation_clone", maxRequests: 10 },
});
