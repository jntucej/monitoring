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
      // misconfigured (zero or multiple kiosk-default operators).
      // 426 = kiosk requires an upgrade (PIN entry UI, or OPEN-mode refused
      // in production). All three mean "auto-session not available, fall
      // back to manual login / claim-code panel."
      const notConfigured = res.status === 404 || res.status === 503 || res.status === 426;
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
      // A 4xx/5xx that is NOT "no kiosk default configured" means something
      // went wrong — surface the error state but still fall through to the
      // normal "unauthenticated → login" redirect on the gate page.
      setState({ pending: false, kioskSession: false, notConfigured: false, error: true });
      return;
    }

    const { accessToken, refreshToken, operator: opInfo, gateId: sessionGateId, noGate: noGateFlag } =
      result.data as {
        accessToken?: string;
        refreshToken?: string;
        operator?: Record<string, unknown>;
        gateId?: string | null;
        noGate?: boolean;
      };

    // No usable token → treat as a config/transport error, fall through to
    // the login redirect on the gate page.
    if (!accessToken || !opInfo) {
      setState({ pending: false, kioskSession: false, notConfigured: false, error: true });
      return;
    }

    // Normalise the operator payload with the same field mapping the rest of
    // the store uses.
    const u = opInfo as Record<string, unknown>;
    const user = {
      id: String(u.id ?? ""),
      uniqueId: (u.uniqueId ?? u.unique_id) as string | undefined,
      handle: u.handle as string | undefined,
      name: u.name ? String(u.name) : "",
      role: (u.role as Role) ?? "operator",
      roles: u.roles as Role[] | undefined,
      gateId: (noGateFlag ? undefined : sessionGateId) as string | undefined,
      email: u.email as string | undefined,
      status: u.status as never,
      photoUrl: (u.photoUrl ?? u.photo_url) as string | undefined,
      currentSessionToken: u.currentSessionToken as string | undefined,
    };

    // Mint the session even when the operator has no gate (noGate === true).
    // The gate page sees authenticated=true + no user.gateId and renders the
    // "Register / enter a claim code" panel instead of redirecting to login.
    //
    // Persist the token to sessionStorage (not just the in-memory store) so a
    // later UI read — e.g. OperatorGateClaimPanel calling /api/operator/claim-gate
    // with the Bearer token — sees it. The partialized localStorage persist
    // only stores {user, role, authenticated}; the token lives in sessionStorage.
    if (typeof window !== "undefined" && accessToken) {
      sessionStorage.setItem("auth.token", accessToken);
      if (refreshToken) sessionStorage.setItem("auth.refresh", refreshToken);
    }

    useAuthStore.setState({
      user,
      token: accessToken,
      refreshToken: refreshToken ?? null,
      role: (user.role as Role) ?? "operator",
      authenticated: true,
      loading: false,
    });

    if (noGateFlag) {
      // No gate: stay where we are (or land on /gate/ so the register panel
      // renders). Do NOT try to redirect to a gate that doesn't exist.
      setState({ pending: false, kioskSession: true, notConfigured: false, error: false });
      return;
    }

    setState({ pending: false, kioskSession: true, notConfigured: false, error: false });

    // Point the kiosk at the session's bound gate when it differs from the
    // URL. The operator can still switch gates via the existing setGate flow.
    if (sessionGateId && sessionGateId !== gateIdParam) {
      router.replace(`/gate/${sessionGateId}`);
    }
  }, [gateIdParam, router]);

  useEffect(() => {
    if (!hydrated) return;
    start();
  }, [hydrated, start]);

  return { state, start };
}
