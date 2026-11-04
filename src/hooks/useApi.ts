/**
 * useApi hook — typed wrapper around fetch() that auto-attaches the JWT
 * token from the auth store, handles JSON, and returns typed responses.
 */
"use client";

import { useCallback, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { singleFlightRefresh } from "@/lib/auth-refresh";
import type { ApiResponse } from "@/lib/types";

function parseFilename(disposition: string | null): string {
  if (!disposition) return 'download';
  const match = disposition.match(/filename="?([^"]+)"?/);
  return match?.[1] ?? 'download';
}

export function useApi() {
  const { token, logout } = useAuthStore();

  /** Build the auth header map from the current store state (no React hook needed). */
  function getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const state = useAuthStore.getState();
    if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
    if (state.user?.currentSessionToken) headers["X-Session-Token"] = state.user.currentSessionToken;
    return headers;
  }

  // Stable ref so the `request` callback below (and anything memoized on it,
  // e.g. a page's `refresh`) keeps a constant identity across renders. An
  // unstable `request` made the actions page's useEffect([refresh]) re-fire on
  // every render — an infinite fetch loop that drove /api/sysadmin/* into 429
  // rate-limit storms (120 req/min observed in api_metrics) and left the page
  // stuck on its loading skeleton.
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  const request = useCallback(
    async <T = unknown>(
      input: string | URL,
      init?: RequestInit
    ): Promise<ApiResponse<T>> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string>),
    };
    if (tokenRef.current) {
      headers["Authorization"] = `Bearer ${tokenRef.current}`;
    }
    const sessionToken = useAuthStore.getState().user?.currentSessionToken;
    if (sessionToken) {
      headers["X-Session-Token"] = sessionToken;
    }

    let res: Response | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        res = await fetch(input, { ...init, headers });
        if (res.status >= 500 && attempts < maxAttempts) {
          const backoff = 500 * Math.pow(2, attempts - 1) + Math.random() * 200;
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }
        break;
      } catch (err) {
        if (attempts >= maxAttempts) throw err;
        const backoff = 500 * Math.pow(2, attempts - 1) + Math.random() * 200;
        await new Promise((r) => setTimeout(r, backoff));
      }
    }

    if (!res) {
      return { success: false, error: "Network error" };
    }

    // Handle 401: attempt one single-flight refresh, then retry the request.
    // Only log out if the retry still returns 401 (genuinely expired session).
    if (res.status === 401) {
      try {
        await singleFlightRefresh();
      } catch {
        // refresh itself failed — fall through to logout
      }

      const refreshedToken = useAuthStore.getState().token;
      if (refreshedToken) {
        const retryHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          ...(init?.headers as Record<string, string>),
        };
        retryHeaders["Authorization"] = `Bearer ${refreshedToken}`;
        const st = useAuthStore.getState().user?.currentSessionToken;
        if (st) retryHeaders["X-Session-Token"] = st;

        const retryRes = await fetch(input, { ...init, headers: retryHeaders });
        if (retryRes.status === 401) {
          logoutRef.current();
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          throw new Error("UNAUTHORIZED");
        }
        // Retry succeeded — proceed with the new response.
        res = retryRes;
      } else {
        // No refreshed token available — hard logout.
        logoutRef.current();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new Error("UNAUTHORIZED");
      }
    }

    // Handle 304 Not Modified explicitly (Issue #558)
    if (res.status === 304) {
      return { success: true, data: undefined };
    }

    const contentType = res.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return {
          success: false,
          error: data?.error?.message ?? `HTTP ${res.status}`,
          code: data?.error?.code,
        };
      }
      return { success: true, data: data as T };
    }

    if (contentType.includes("text/csv")) {
      const blob = await res.blob();
      return {
        success: res.ok,
        data: { blob, filename: parseFilename(res.headers.get("content-disposition")) } as any,
      };
    }

    if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}` };
    }

    // Fallback: return raw text
    const text = await res.text();
    return { success: true, data: text as any };
     
  }, []);

  const get = <T = unknown>(url: string) => request<T>(url, { method: "GET" });
  const post = <T = unknown>(url: string, body: unknown) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body) });
  const put = <T = unknown>(url: string, body: unknown) =>
    request<T>(url, { method: "PUT", body: JSON.stringify(body) });
  const del = <T = unknown>(url: string) => request<T>(url, { method: "DELETE" });

  return { request, get, post, put, del, getHeaders };
  }
