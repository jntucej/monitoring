/**
 * Auth & error helpers for student-dashboard surfaces.
 *
 * The persisted zustand store (localStorage key `gate-monitor-auth`) mixes
 * camelCase and snake_case shapes depending on which login leg wrote it, so
 * roll extraction must tolerate both. These helpers centralize that logic so
 * every dashboard surface degrades gracefully instead of failing on a raw
 * sessionStorage parse.
 */
import { useAuthStore } from "@/stores/authStore";
import { getAuthHeaders } from "@/lib/utils";
import type { User } from "@/lib/types";

/**
 * Best-effort roll (user's unique_id) extraction.
 * 1. Live zustand store (canonical camelCase shape, `toUser`-normalized).
 * 2. Persisted `gate-monitor-auth` JSON (localStorage first, then
 *    sessionStorage) — tolerates both `state.user` and top-level `user`,
 *    plus uniqueId / unique_id / roll.
 * Returns null when no roll can be recovered (caller should show a friendly
 * banner + retry, not crash).
 */
export function extractStudentRoll(user: User | null | undefined): string | null {
  const live = user?.uniqueId;
  if (typeof live === "string" && live.trim()) return live.trim();
  try {
    const raw =
      (typeof window !== "undefined"
        ? window.localStorage.getItem("gate-monitor-auth") ?? window.sessionStorage.getItem("gate-monitor-auth")
        : null) ?? null;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const cand = [
      parsed?.state?.user?.uniqueId,
      parsed?.state?.user?.unique_id,
      parsed?.state?.user?.roll,
      parsed?.user?.uniqueId,
      parsed?.user?.unique_id,
      parsed?.user?.roll,
    ];
    const found = cand.find((v: unknown) => typeof v === "string" && v.trim());
    return typeof found === "string" ? found.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Human-friendly banner message for API failures. Maps the common cases so
 * the UI never shows a raw "Gateway telemetry unavailable" with no cause.
 */
export function friendlyApiError(status: number | null, detail: string): string {
  if (status === 401) return "Session expired — please re-login to continue.";
  if (status === 403) return "You don't have permission to view this data.";
  if (status === 404) return "No data found yet — check back later.";
  if (status && status >= 500) return "Server error — please retry.";
  if (status === 429) return "Too many requests — please wait a moment.";
  return detail ? detail : "Unable to load this data.";
}

/**
 * Authenticated fetch that also yields a friendly error message:
 *   { ok, status, detail, json }
 * - 401 triggers revalidation via the zustand store's checkSession()
 *   (same path AuthGuard uses) so a stale session self-heals on retry.
 */
export async function fetchAuthWithFriendlyError(
  url: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number | null; detail: string; json: unknown; friendly: string }> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { ...getAuthHeaders(), ...(init.headers ?? {}) },
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: null, detail: "Network error", json: null, friendly: "Network error — check your connection and retry." };
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!res.ok) {
    const detail =
      (json as { error?: { message?: string } } | null)?.error?.message ??
      (res.statusText || `HTTP ${res.status}`);
    if (res.status === 401) {
      // Best-effort session revalidation (token rotation / expiry).
      void useAuthStore.getState().checkSession();
    }
    return { ok: false, status: res.status, detail, json, friendly: friendlyApiError(res.status, detail) };
  }
  return { ok: true, status: res.status, detail: "", json, friendly: "" };
}
