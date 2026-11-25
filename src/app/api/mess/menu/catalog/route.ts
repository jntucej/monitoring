// GET /api/mess/menu/catalog — the mess_menu_items catalog (dish codes/labels)
// used by the MenuEditor to pick which dishes to schedule into a week.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

async function handleGet(_req: NextRequest, _ctx: { auth: import("@/lib/authContext").AuthContext }) {
  const { rows } = await query<{ id: string; code: string; label: string }>(
    `SELECT id, code, label FROM public.mess_menu_items ORDER BY sort_order, label`
  );
  return ok(rows);
}

export const GET = withAuthorization(handleGet);
