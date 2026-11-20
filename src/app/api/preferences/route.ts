// /api/preferences/route.ts
// GET  — the user's stored preference overrides (user layer).
// PATCH — set one or more preference keys. Rejects keys not in the registry,
//         and rejects user-written values for "required"-rank keys (policy
//         owns those; the user's value is stored but never applied).
//
// Auth: any authenticated user (their own prefs). Server validates every key
// against lib/preferences/registry — the guardrail against drift.

import { NextRequest } from "next/server";
import { verifyAccessToken, type AuthTokenClaims } from "@/lib/auth-token";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { isKnownPrefKey, prefRank } from "@/lib/preferences/registry";

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization") ?? "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

async function userId(req: NextRequest): Promise<string | null> {
  const token = extractToken(req);
  if (!token) return null;
  const claims: AuthTokenClaims | null = await verifyAccessToken(token);
  return claims?.id ?? null;
}

export async function GET(req: NextRequest) {
  const uid = await userId(req);
  if (!uid) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { rows } = await query<{ prefs: Record<string, unknown> }>(
    `SELECT prefs FROM public.user_preference_overrides WHERE user_id = $1`,
    [uid],
  );

  return Response.json({ success: true, prefs: rows[0]?.prefs ?? {} });
}

export async function PATCH(req: NextRequest) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const uid = await userId(req);
  if (!uid) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { prefs?: Record<string, unknown> };
  const incoming = body.prefs ?? {};
  const keys = Object.keys(incoming);
  if (keys.length === 0) {
    return Response.json({ success: false, error: "No preference keys provided" }, { status: 400 });
  }

  // Guardrail: reject keys that are not in the registry (drift protection).
  const unknown = keys.filter((k) => !isKnownPrefKey(k));
  if (unknown.length > 0) {
    return Response.json(
      { success: false, error: `Unknown preference key(s): ${unknown.join(", ")}` },
      { status: 400 },
    );
  }

  // "required"-rank keys: the user may store a preference (audit), but the
  // resolver never applies it — policy wins. We still persist the user's
  // intent so a future policy relaxation honors it.
  const stored: Record<string, unknown> = {};
  for (const k of keys) stored[k] = incoming[k];

  // Merge into the user's row (JSONB key-value).
  await query(
    `INSERT INTO public.user_preference_overrides (user_id, prefs)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (user_id) DO UPDATE SET
       prefs = user_preference_overrides.prefs || EXCLUDED.prefs,
       updated_at = now()`,
    [uid, JSON.stringify(stored)],
  );

  // Report which keys are policy-locked (so the client can show the 🔒).
  const locked = keys.filter((k) => prefRank(k) === "required");

  return Response.json({
    success: true,
    stored: keys,
    lockedByPolicy: locked,
  });
}
