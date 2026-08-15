/**
 * useApi hook — typed wrapper around fetch() that auto-attaches the JWT
 * token from the auth store, handles JSON, and returns typed responses.
 */
"use client";

import { useAuthStore } from "@/stores/authStore";
import type { ApiResponse } from "@/lib/types";

export function useApi() {
  const { token } = useAuthStore();

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

    const res = await fetch(input, { ...init, headers });
    const data = await res.json();
    return data as ApiResponse<T>;
  };

  const get = (url: string) => request(url, { method: "GET" });
  const post = (url: string, body: any) =>
    request(url, { method: "POST", body: JSON.stringify(body) });
  const put = (url: string, body: any) =>
    request(url, { method: "PUT", body: JSON.stringify(body) });
  const del = (url: string) => request(url, { method: "DELETE" });

  return { request, get, post, put, del };
}
