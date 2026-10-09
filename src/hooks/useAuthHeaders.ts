"use client";

import { useAuthStore } from "@/stores/authStore";
import { getAuthHeaders } from "@/lib/utils";

export { getAuthHeaders };

/**
 * Custom React hook to retrieve authentication and session headers for API calls.
 */
export function useAuthHeaders(): Record<string, string> {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const sessionToken = user?.currentSessionToken;
  if (sessionToken) {
    headers["X-Session-Token"] = sessionToken;
  }
  return headers;
}
