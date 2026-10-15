"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore, useHasHydrated } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/types";

export interface KioskSessionState {
  /** True while the kiosk endpoint call is in flight — callers must hold
   *  off on any "unauthenticated → redirect to login" action during this. */
  pending: boolean;
  /** True when the endpoint issued a default-operator session. */
  kioskSession: boolean;
  /** True when the endpoint reported no kiosk operator is configured (404)
   *  or the kiosk operator config is invalid (503 KIOSK_OPERATOR_MISCONFIGURED). */
  notConfigured: boolean;
  /** True on network error / rate-limit / malformed response. */
  error: boolean;
}

/**
 * useKioskOperator — auto-sign-in for the gate kiosk.
 *
 * On mount, if there is NO active auth session, calls
 * GET /api/operator/kiosk-session to mint a short-lived default-operator
 * JWT and stores it in the auth store so the kiosk "just works" without
 * manual credential entry.
 *
 * Precedence rule (the critical one):
 *   - The hook only acts when the auth store has no active session at
 *     hydration time. A real operator's PIN/password login ALWAYS takes
 *     precedence: if a session already exists, this hook is a no-op.
 *   - Once the kiosk session is stored, any subsequent normal login
 *     (PIN or password) overwrites it via the standard store actions.
 *
 * Callers should check `state.pending` before redirecting unauthenticated
 * users to the login page: while the kiosk fetch is in flight, a default
 * session may still arrive and flip `authenticated` to true.
 */
export function useKioskOperator(gateIdParam?: string | null) {
  const router = useRouter();
  const hydrated = useHasHydrated();
  const startedRef = useRef(false);

  const [state, setState] = useState<KioskSessionState>({
    pending: false,
    kioskSession: false,
    notConfigured: false,
    error: false,
  });

  const start = useCallback(async () => {
    // Strict-mode double-invoke guard + idempotency: run once per mount.
    if (startedRef.current) return;

    const store = useAuthStore.getState();
    // Precedence: never override an active real operator session.
    if (store.authenticated && store.user) return;
    startedRef.current = true;
    setState({ pending: true, kioskSession: false, notConfigured: false, error: false });

    const qs = gateIdParam ? `?gateId=${encodeURIComponent(gateIdParam)}` : "";
    let res: Response;
    try {
      res = await fetch(`/api/operator/kiosk-session${qs}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
    } catch {
      // Network error — no kiosk session available.
      setState({ pending: false, kioskSession: false, notConfigured: false, error: true });
      return;
    }

    if (!res.ok) {
      // 404 = no kiosk operator configured; 503 = kiosk operator
      // misconfigured (zero or multiple kiosk-default operators) — both
      // mean "not configured", show the not-configured panel, fall back
      // to manual login. 429 = rate-limited: treat as error.
      const notConfigured = res.status === 404 || res.status === 503;
      setState({
        pending: false,
        kioskSession: false,
        notConfigured,
        error: !notConfigured,
      });
      return;
    }

    const result = await res.json().catch(() => null);
    if (!result?.success || !result?.data) {
      setState({ pending: false, kioskSession: false, notConfigured: false, error: true });
      return;
    }

    const { token, refreshToken, user: rawUser, kiosk } = result.data as {
      token: string;
      refreshToken: string;
      user: Record<string, unknown>;
      kiosk?: { gateId: string | null; gateName: string | null };
    };

    // Normalise with the same field mapping the rest of the store uses.
    const u = rawUser as Record<string, unknown>;
    const user = {
      id: String(u.id ?? ""),
      uniqueId: (u.uniqueId ?? u.unique_id) as string | undefined,
      handle: u.handle as string | undefined,
      name: u.name ? String(u.name) : "",
      role: (u.role as Role) ?? "operator",
      roles: u.roles as Role[] | undefined,
      gateId: (kiosk?.gateId ?? u.gateId ?? u.gate_id) as string | undefined,
      email: u.email as string | undefined,
      status: u.status as never,
      photoUrl: (u.photoUrl ?? u.photo_url) as string | undefined,
      currentSessionToken: u.currentSessionToken as string | undefined,
    };

    useAuthStore.setState({
      user,
      token,
      refreshToken: refreshToken ?? null,
      role: (user.role as Role) ?? "operator",
      authenticated: true,
      loading: false,
    });

    setState({ pending: false, kioskSession: true, notConfigured: false, error: false });

    // Point the kiosk at the session's bound gate when it differs from the
    // URL. The operator can still switch gates via the existing setGate flow.
    if (kiosk?.gateId && kiosk.gateId !== gateIdParam) {
      router.replace(`/gate/${kiosk.gateId}`);
    }
  }, [gateIdParam, router]);

  useEffect(() => {
    if (!hydrated) return;
    start();
  }, [hydrated, start]);

  return { state, start };
}
