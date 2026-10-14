import { NextRequest, NextResponse } from "next/server";
import { query, addAudit } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { withAdminMutation } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, _ctx: { auth: AuthContext }) {
  try {
    const itemsRes = await query(
      `SELECT mi.id, mi.code, mi.label, mi.is_primary AS isPrimary,
              mi.sort_order AS sortOrder, mi.is_active AS isActive,
              COALESCE(ma.applicable_to, ARRAY[]::text[]) AS applicableTo
         FROM mess_menu_items mi
         LEFT JOIN LATERAL (
            SELECT ARRAY(
              SELECT DISTINCT m2.applicable_to FROM mess_menu_applicability m2
               WHERE m2.menu_item_id = mi.id
            ) AS applicable_to
         ) ma ON TRUE
        ORDER BY mi.sort_order ASC, mi.code ASC`,
      []
    );

    return ok({
      items: itemsRes.rows.map((r: any) => ({
        id: r.id,
        code: r.code,
        label: r.label,
        isPrimary: r.isPrimary,
        sortOrder: r.sortOrder,
        isActive: r.isActive,
        applicableTo: r.applicableTo ?? [],
      })),
    });
  } catch (err) {
    console.error("[mess/menu-items GET]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to list menu items" } },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const body = await req.json().catch(() => null);
    const code: string = (body?.code ?? "").toString().trim();
    const label: string = (body?.label ?? "").toString().trim();
    const isPrimary: boolean = body?.isPrimary === true;
    const sortOrder: number = Number.isFinite(body?.sortOrder) ? Number(body.sortOrder) : 99;
    const applicableTo: string[] = Array.isArray(body?.applicableTo)
      ? body.applicableTo.filter((s: unknown) => typeof s === "string")
      : ["HM", "HF"];

    if (!code || !label) return fail("MISSING_PARAM", "code and label are required", 400);

    const dup = await query(
      `SELECT id FROM mess_menu_items WHERE code = $1 LIMIT 1`,
      [code]
    );
    if (dup.rows.length > 0) {
      return fail("DUPLICATE_CODE", `Menu item code ${code} already exists`, 409);
    }

    const inserted = await query(
      `INSERT INTO mess_menu_items (code, label, is_primary, sort_order)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [code, label, isPrimary, sortOrder]
    );
    const id: string = inserted.rows[0].id;

    if (applicableTo.length > 0) {
      for (const t of applicableTo) {
        await query(
          `INSERT INTO mess_menu_applicability (menu_item_id, applicable_to)
           VALUES ($1::uuid, $2::text)`,
          [id, t]
        );
      }
    }

    await addAudit({
      action: "MESS_MENU_ITEM_CREATED",
      userId: auth.userId,
      role: auth.role,
      details: { id, code, label, isPrimary, sortOrder, applicableTo },
    });

    return ok({ id, code, label, isPrimary, sortOrder, applicableTo }, 201);
  } catch (err) {
    console.error("[mess/menu-items POST]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create menu item" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(async (req, ctx) => handleGet(req, ctx), { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "mess_menu_items_get" }
);

export const POST = withAdminMutation(handlePost, {
  rateLimit: { windowMs: 60_000, maxRequests: 20 },
});
