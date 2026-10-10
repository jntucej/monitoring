/**
 * useApi hook — typed wrapper around fetch() that auto-attaches the JWT
 * token from the auth store, handles JSON, and returns typed responses.
 */
"use client";

import { useAuthStore } from "@/stores/authStore";
import type { ApiResponse } from "@/lib/types";

function parseFilename(disposition: string | null): string {
  if (!disposition) return 'download';
  const match = disposition.match(/filename="?([^"]+)"?/);
  return match?.[1] ?? 'download';
}

export function useApi() {
  const { token, logout } = useAuthStore();

  const request = async <T = any>(
    input: string | URL,
    init?: RequestInit
  ): Promise<ApiResponse<T>> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string>),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const sessionToken = useAuthStore.getState().user?.currentSessionToken;
    if (sessionToken) {
      headers["X-Session-Token"] = sessionToken;
    }

    const res = await fetch(input, { ...init, headers });

    // Handle authentication/authorization
    if (res.status === 401) {
      logout();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("UNAUTHORIZED");
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
  };

  const get = (url: string) => request(url, { method: "GET" });
  const post = (url: string, body: any) =>
    request(url, { method: "POST", body: JSON.stringify(body) });
  const put = (url: string, body: any) =>
    request(url, { method: "PUT", body: JSON.stringify(body) });
  const del = (url: string) => request(url, { method: "DELETE" });

  return { request, get, post, put, del };
}
