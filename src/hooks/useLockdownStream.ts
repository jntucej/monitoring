"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";

/**
 * useLockdownStream — live, SSE-driven view of the active + pending lockdown
 * rules, for the gate desk's restriction strip.
 *
 * Subscribes to /api/admin/lockdown/stream (auth via cookie/Authorization
 * header is NOT available on a bare EventSource, so we use fetch-based
 * streaming to attach the JWT). Emits the most recent state; the stream's
 * 2s server poll means a newly-issued rule shows within ~2s.
 *
 * Returns { activeRules, pendingRules, connected } where each rule is the
 * stream's summary shape (scope_type + human public_message + direction +
 * expiry) — never target_values UUIDs.
 */

export interface StreamLockdownRule {
  id: string;
  scope_type: string;
  /**
   * Intentionally absent from the SSE stream payload: a `user`-scoped
   * rule's target_values are user UUIDs (sysadmin-only), so the desk-safe
   * stream omits them. The gate-match in the desk treats a missing
   * target_values as "not this gate" (the legacy /api/lockdown/active
   * hard signal covers campus/gate separately).
   */
  target_values?: string[];
  direction: "IN" | "OUT" | "BOTH";
  status: string;
  public_message: string | null;
  expires_at: string | null;
  evacuation?: boolean;
}

interface StreamState {
  activeRules: StreamLockdownRule[];
  pendingRules: StreamLockdownRule[];
  connected: boolean;
}

export function useLockdownStream(enabled = true): StreamState {
  const [state, setState] = useState<StreamState>({
    activeRules: [],
    pendingRules: [],
    connected: false,
  });
  const authenticated = useAuthStore((s) => s.authenticated);

  useEffect(() => {
    if (!enabled || !authenticated) return;
    let cancelled = false;
    let abort: AbortController | null = null;

    async function connect() {
      const token = useAuthStore.getState().token;
      abort = new AbortController();
      try {
        const res = await fetch("/api/admin/lockdown/stream", {
          headers: {
            Accept: "text/event-stream",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
          signal: abort!.signal,
        });
        if (!res.ok || !res.body) {
          setState((s) => ({ ...s, connected: false }));
          return;
        }
        setState((s) => ({ ...s, connected: true }));
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done || cancelled) break;
          buf += decoder.decode(value, { stream: true });
          // SSE frames are separated by a blank line.
          let idx;
          while ((idx = buf.indexOf("\n\n")) >= 0) {
            const frame = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            const dataLine = frame
              .split("\n")
              .find((l) => l.startsWith("data:"));
            if (!dataLine) continue;
            try {
              const payload = JSON.parse(dataLine.slice(5).trim());
              if (Array.isArray(payload.activeRules) || Array.isArray(payload.pendingRules)) {
                setState({
                  activeRules: payload.activeRules ?? [],
                  pendingRules: payload.pendingRules ?? [],
                  connected: true,
                });
              }
            } catch {
              /* partial frame — keep waiting */
            }
          }
        }
      } catch {
        /* aborted or network error */
      } finally {
        if (!cancelled) {
          setState((s) => ({ ...s, connected: false }));
          // Reconnect after a short delay (the stream also auto-closes at 45s).
          setTimeout(() => {
            if (!cancelled) connect();
          }, 3000);
        }
      }
    }

    connect();
    return () => {
      cancelled = true;
      abort?.abort();
    };
  }, [enabled, authenticated]);

  return state;
}
