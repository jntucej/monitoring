import { errMsg } from "@/lib/err-msg";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";

/**
 * Merged announcement + campus-feed items endpoint.
 *
 * Returns a unified, newest-first list of active items from both:
 *   1. public.announcements      — classic admin-published announcements (audience-filtered)
 *   2. public.campus_feed_items — circulars, events, alerts (target_scope filtered by the
 *                                 caller's scopes: global / dept:X / hostel:X / class:X / mess)
 *
 * Every item carries `kind` and `source` so the UI can categorize and badge.
 * Legacy `announcements` rows get kind="announcement", source="announcements".
 */

interface UnifiedItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  priority: string;
  audience: string;
  created_at: string;
  expires_at: string | null;
  source: "announcements" | "campus_feed";
}

async function handleGet(req: NextRequest) {
  try {
    const actorId = req.headers.get("x-user-id") || "";
    const actorRole = req.headers.get("x-user-role") || "student";
    const supabase = getSupabaseServiceClient();

    // --- Source 1: legacy announcements table ---
    const { data: announcements, error: ancErr } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    const { data: dismissals } = await supabase
      .from("user_announcement_dismissals")
      .select("announcement_id")
      .eq("user_id", actorId);

    const dismissedIds = new Set((dismissals || []).map((d: { announcement_id: string }) => d.announcement_id));

    const legacyItems: UnifiedItem[] =
      (announcements ?? [])
        .filter((a: Record<string, unknown>) => {
          if (dismissedIds.has(a.id as string)) return false;
          if (a.expires_at && new Date(a.expires_at as string) < new Date()) return false;
          const audience = (a.audience as string) ?? "all";
          return audience === "all" || audience === actorRole;
        })
        .map((a: Record<string, unknown>) => ({
          id: a.id as string,
          kind: "announcement",
          title: (a.title as string) ?? "",
          body: (a.message as string) ?? "",
          priority: (a.priority as string) ?? "normal",
          audience: (a.audience as string) ?? "all",
          created_at: a.created_at as string,
          expires_at: (a.expires_at as string | null) ?? null,
          source: "announcements" as const,
        }));

    // --- Source 2: campus_feed_items (circulars, events, alerts) ---
    // Resolve the caller's scopes using the same grammar as src/lib/student/feed.ts
    const { rows: scopeRows } = await query<Record<string, unknown>[]>(
      `SELECT ARRAY['global'] || COALESCE(
         ARRAY(SELECT CASE WHEN sd.department IS NOT NULL
               THEN 'dept:' || sd.department END), {}
       ) || COALESCE(
         ARRAY(SELECT CASE WHEN sd.department IS NOT NULL AND sd.semester IS NOT NULL
               THEN 'class:' || sd.department || '-' || sd.semester END), {}
       ) || COALESCE(
         ARRAY(SELECT CASE WHEN COALESCE(sd.hostel_block, u.hostel_block) IS NOT NULL
               THEN 'hostel:' || COALESCE(sd.hostel_block, u.hostel_block) END), {}
       )
       FROM public.users u
       LEFT JOIN public.student_details sd ON sd.user_id = u.id
      WHERE u.id = $1::uuid
      LIMIT 1`,
      [actorId],
    );
    const scopeRow = (scopeRows[0] ?? {}) as unknown as { [k: string]: unknown };
    const scopes: string[] = (scopeRow["1"] as string[]) ?? ["global"];

    const { rows: feedRows } = await query<Record<string, unknown>>(
      `SELECT id, kind, title, body_md, priority, target_scope, posted_at, expires_at
         FROM public.campus_feed_items
        WHERE status = 'active'
          AND (expires_at IS NULL OR expires_at > NOW())
          AND target_scope = ANY($1::text[])
        ORDER BY (priority = 'urgent') DESC, posted_at DESC
        LIMIT 50`,
      [scopes],
    );

    const feedItems: UnifiedItem[] = (feedRows ?? []).map((f) => ({
      id: `cf-${f.id as string}`,
      kind: (f.kind as string) ?? "announcement",
      title: (f.title as string) ?? "",
      body: (f.body_md as string) ?? "",
      priority: (f.priority as string) ?? "normal",
      audience: (f.target_scope as string) ?? "global",
      created_at: f.posted_at as string,
      expires_at: (f.expires_at as string | null) ?? null,
      source: "campus_feed" as const,
    }));

    // Merge both sources, newest-first
    const merged: UnifiedItem[] = [...legacyItems, ...feedItems].sort((a, b) =>
      (b.created_at ?? "").localeCompare(a.created_at ?? ""),
    );

    return NextResponse.json({ success: true, data: merged });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: errMsg(error) } },
      { status: 500 },
    );
  }
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["sysadmin", "admin", "operator", "faculty", "student", "parent", "principal", "staff"],
});
