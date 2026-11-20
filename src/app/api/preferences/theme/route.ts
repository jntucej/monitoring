// /api/preferences/theme/route.ts
// GET  — return the logged-in user's ui_theme ('sakuga' | 'graphite').
//        The ClientProviders loader fetches this on module init; if 'sakuga',
//        it sets data-theme="sakuga" on <html> and loads the sakuga-vfx
//        component scripts. No re-render needed: the CSS palette override in
//        globals.css handles the color swap; the JS components are
//        progressive enhancement on top.
//
// PATCH — set the user's ui_theme. Also exposed to /settings in the bot.

import { NextRequest } from "next/server";
import { verifyAccessToken, AuthTokenClaims } from "@/lib/auth-token";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization") ?? "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

export async function GET(req: NextRequest) {
  const token = extractToken(req);
  if (!token) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const claims: AuthTokenClaims | null = await verifyAccessToken(token);
  if (!claims?.id) {
    return Response.json({ success: false, error: "Invalid token" }, { status: 401 });
  }

  const { rows } = await query<{ ui_theme: string }>(
    `SELECT ui_theme FROM public.personalization_prefs WHERE user_id = $1`,
    [claims.id],
  );

  return Response.json({
    success: true,
    ui_theme: rows[0]?.ui_theme ?? "graphite",
  });
}

export async function PATCH(req: NextRequest) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const token = extractToken(req);
  if (!token) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const claims: AuthTokenClaims | null = await verifyAccessToken(token);
  if (!claims?.id) {
    return Response.json({ success: false, error: "Invalid token" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const ui_theme = (body.ui_theme ?? "").toLowerCase();
  if (!["sakuga", "graphite"].includes(ui_theme)) {
    return Response.json(
      { success: false, error: "ui_theme must be 'sakuga' or 'graphite'" },
      { status: 400 },
    );
  }

  await query(
    `INSERT INTO public.personalization_prefs (user_id, ui_theme)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET ui_theme = EXCLUDED.ui_theme`,
    [claims.id, ui_theme],
  );

  // Audit: user chose their own theme — low-impact, but logged for the chain
  await query(
    `INSERT INTO public.audit_events
       (actor_id, actor_type, role_context, action, resource, resource_id, after_state)
     VALUES ($1, 'user', $2, 'ui_theme_changed', 'personalization_prefs', $3, $4)`,
    [claims.id, claims.role, claims.id, JSON.stringify({ ui_theme })],
  ).catch(() => undefined);

  return Response.json({ success: true, ui_theme });
}
