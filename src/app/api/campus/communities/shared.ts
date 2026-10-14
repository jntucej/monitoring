// src/app/api/campus/communities/shared.ts
// Shared, index-friendly helpers for the community routes.
//
// Every caller-supplied community id is validated against the `communities`
// table before use (NOT_FOUND if absent). Membership state is derived from a
// single query on `community_memberships(community_id, user_id)` so the
// hot paths stay at one round-trip per request.

import type { SupabaseClient } from "@supabase/supabase-js";

export type MembershipRole = "member" | "moderator" | "admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pull and validate the community id from a .../communities/{id}/... URL. */
export function communityIdFromUrl(url: URL): string | null {
  const segments = url.pathname.split("/").filter(Boolean);
  // /api/campus/communities/{id}[/...]
  const idx = segments.indexOf("communities");
  if (idx === -1) return null;
  const id = decodeURIComponent(segments[idx + 1] ?? "");
  return UUID_RE.test(id) ? id : null;
}

/** Load a community row; null when it does not exist. */
export async function findCommunity(db: SupabaseClient, id: string) {
  const { data, error } = await db
    .from("communities")
    .select("id, name, description, icon, is_moderated, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * The caller's membership role in a community, or null when not a member.
 * One indexed lookup; the moderator/admin global roles are layered on top
 * by the caller (they can moderate every community).
 */
export async function membershipRoleIn(
  db: SupabaseClient,
  communityId: string,
  userId: string
): Promise<MembershipRole | null> {
  const { data, error } = await db
    .from("community_memberships")
    .select("role_in_community")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return String((data as { role_in_community?: string }).role_in_community) as MembershipRole;
}

/** True when the caller moderates the community (membership or global role). */
export function canModerate(
  roleInCommunity: MembershipRole | null,
  globalRole: string
): boolean {
  return (
    roleInCommunity === "moderator" ||
    roleInCommunity === "admin" ||
    globalRole === "admin" ||
    globalRole === "sysadmin"
  );
}

/**
 * Membership count + the caller's own role for one community, in a single
 * membership-table scan (indexed on community_id).
 */
export async function communityMembershipState(
  db: SupabaseClient,
  communityId: string,
  userId: string
): Promise<{ memberCount: number; myRole: MembershipRole | null }> {
  const { data, error } = await db
    .from("community_memberships")
    .select("user_id, role_in_community")
    .eq("community_id", communityId);
  if (error) throw error;
  let memberCount = 0;
  let myRole: MembershipRole | null = null;
  for (const row of data ?? []) {
    memberCount += 1;
    if (row.user_id === userId) {
      myRole = String((row as { role_in_community?: string }).role_in_community) as MembershipRole;
    }
  }
  return { memberCount, myRole };
}
