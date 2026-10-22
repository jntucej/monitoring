/**
 * Single-flight refresh helper for the browser.
 *
 * The refresh token is stored in sessionStorage (key "auth.refresh") and the
 * /api/auth/refresh route reads it from the httpOnly cookie. This module
 * deduplicates concurrent calls so that when two hooks fire a 401 at the
 * same time only ONE /refresh request is in-flight; every other caller
 * awaits the same promise. Without this, the second caller presents an
 * already-rotated refresh token and triggers the server's "revoke all
 * sessions" path, logging the user out.
 *
 * Usage:
 *   import { singleFlightRefresh } from "@/lib/auth-refresh";
 *   if (res.status === 401) {
 *     await singleFlightRefresh();
 *     // retry the request once; if still 401, log out.
 *   }
 */
"use client";

import { tokenStorage, useAuthStore } from "@/stores/authStore";

let inflight: Promise<void> | null = null;

export function singleFlightRefresh(): Promise<void> {
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const refresh = useAuthStore.getState().refreshToken ?? tokenStorage.get().refreshToken;
      if (!refresh) return; // nothing to refresh with

      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
        headers: { "x-refresh-token": refresh },
      });
      if (res.ok) {
        // The refresh route sets fresh cookies and (now) returns the tokens
        // in the JSON body. Update the in-memory store + sessionStorage so
        // subsequent requests use the new access token immediately.
        const body = await res.json().catch(() => null);
        const newAccess = body?.accessToken;
        const newRefresh = body?.refreshToken;
        if (newAccess) {
          useAuthStore.setState({ token: newAccess });
          tokenStorage.set({
            token: newAccess,
            refreshToken: newRefresh ?? null,
          });
        } else {
          // Body didn't carry tokens (older server build). Re-sync via the
          // session route, which mints + rotates correctly.
          await useAuthStore.getState().checkSession();
        }
      } else if (res.status === 409) {
        // SESSION_RACE: the session was just rotated in another tab.
        // Call checkSession to re-sync tokens without a destructive path.
        await useAuthStore.getState().checkSession();
      }
      // 401 / 403: token genuinely revoked — leave to the caller's logout.
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
