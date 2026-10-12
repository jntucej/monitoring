import { NextRequest, NextResponse } from "next/server";
import { query, addAudit } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

function getItemId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1] ?? "");
}

async function handlePatch(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const id = getItemId(req);
    if (!id) return fail("MISSING_PARAM", "Menu item id required", 400);

    const body = await req.json().catch(() => null);
    const existing = await query(`SELECT * FROM mess_menu_items WHERE id::text = $1`, [id]);
    if (existing.rows.length === 0) return fail("NOT_FOUND", "Menu item not found", 404);

    const code: string | undefined = typeof body?.code === "string" ? body.code.trim() : undefined;
    const label: string | undefined = typeof body?.label === "string" ? body.label.trim() : undefined;
    const isPrimary: boolean | undefined = typeof body?.isPrimary === "boolean" ? body.isPrimary : undefined;
    const sortOrder: number | undefined = Number.isFinite(body?.sortOrder) ? Number(body.sortOrder) : undefined;
    const isActive: boolean | undefined = typeof body?.isActive === "boolean" ? body.isActive : undefined;
    const applicableTo: string[] | undefined = Array.isArray(body?.applicableTo)
      ? body.applicableTo.filter((s: unknown) => typeof s === "string")
      : undefined;

    await query(
      `UPDATE mess_menu_items
          SET code = COALESCE($2, code),
              label = COALESCE($3, label),
              is_primary = COALESCE($4, is_primary),
              sort_order = COALESCE($5, sort_order),
              is_active = COALESCE($6, is_active)
        WHERE id::text = $1`,
      [id, code ?? null, label ?? null, isPrimary ?? null, sortOrder ?? null, isActive ?? null]
    );

    if (applicableTo) {
      await query(`DELETE FROM mess_menu_applicability WHERE menu_item_id::text = $1`, [id]);
      for (const t of applicableTo) {
        await query(
          `INSERT INTO mess_menu_applicability (menu_item_id, applicable_to)
           VALUES ($1::uuid, $2::text)`,
          [id, t]
        );
      }
    }

    const updated = await query(
      `SELECT id, code, label, is_primary AS isPrimary, sort_order AS sortOrder, is_active AS isActive
         FROM mess_menu_items WHERE id::text = $1`,
      [id]
    );

    await addAudit({
      action: "MESS_MENU_ITEM_UPDATED",
      userId: auth.userId,
      role: auth.role,
      details: { id, changes: { code, label, isPrimary, sortOrder, isActive, applicableTo } },
    });

    return ok(updated.rows[0]);
  } catch (err) {
    console.error("[mess/menu-items/[id] PATCH]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update menu item" } },
      { status: 500 }
    );
  }
}

async function handleDelete(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const id = getItemId(req);
    if (!id) return fail("MISSING_PARAM", "Menu item id required", 400);

    const res = await query(
      `UPDATE mess_menu_items SET is_active = FALSE WHERE id::text = $1 RETURNING id, code, label`,
      [id]
    );
    if (res.rows.length === 0) return fail("NOT_FOUND", "Menu item not found", 404);

    await addAudit({
      action: "MESS_MENU_ITEM_DEACTIVATED",
      userId: auth.userId,
      role: auth.role,
      details: { id, code: res.rows[0].code, label: res.rows[0].label },
    });

    return ok({ id, deactivated: true });
  } catch (err) {
    console.error("[mess/menu-items/[id] DELETE]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to deactivate menu item" } },
      { status: 500 }
    );
  }
}

export const PATCH = withRateLimit(
  withAuthorization(async (req, ctx) => handlePatch(req, ctx), { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "mess_menu_items_patch", maxRequests: 20 }
);

export const DELETE = withRateLimit(
  withAuthorization(async (req, ctx) => handleDelete(req, ctx), { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "mess_menu_items_delete", maxRequests: 20 }
);
