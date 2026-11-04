/**
 * gateStore — gate identity + live gate mode / lockdown.
 *
 * Part of the operator-store split (UI-audit fix 6). All action bodies
 * below are VERBATIM from operatorStore.ts.
 */
import { create } from "zustand";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import type { GateMode } from "@/lib/gate-operations";
import type { LockdownInfo } from "@/components/operator/GateModeBanner";
import type { Gate } from "@/lib/types";
import { useAuthStore } from "@/stores/authStore";

interface GateState {
  gate: Gate | null;
  gateId: string | null;
  gateMode: GateMode;
  lockdown: LockdownInfo | null;
  lockdownDismissed: boolean;
  setGate: (gateId: string) => void;
  loadGateMode: () => Promise<void>;
  loadLockdown: () => Promise<void>;
  dismissLockdown: () => void;
  overrideGateMode: (mode: GateMode, reason: string) => Promise<void>;
}

export const useGateStore = create<GateState>((set, get) => ({
  gate: null,
  gateId: null,
  gateMode: "OPEN",
  lockdown: null,
  lockdownDismissed: false,

    setGate: async (gateId: string) => {
    if (!gateId) {
      set({ gate: null, gateId: null });
      return;
    }
    const user = useAuthStore.getState().user;
    if (user?.role === "operator" && user.gateId && user.gateId !== gateId) {
      // Silent snap-back: the operator is viewing a gate they don't own.
      // Re-anchor to their assigned gate without a toast — toasts stack
      // on top of the camera surface and the desk already shows a
      // per-gate header. The URL deep-link guard (gate page) will
      // router.replace to /gate/<assigned> on the next render pass.
      set({
        gate: { id: user.gateId, name: user.gateId, location: "Assigned Gate", type: "ENTRY_EXIT" as const, isActive: true },
        gateId: user.gateId,
      });
      return;
    }
    // Keep the gate identifier exactly as the URL supplied it (UUID, code,
    // or bare digit). findGateById resolves both UUID ids and gate codes, so
    // normalising a bare "1" to "gate-1" here would hide the real code from
    // the fallback lookup and break scans against gates whose code is not
    // literally "gate-1".
    set({
      gate: { id: gateId, name: gateId, location: "Main Gate", type: "ENTRY_EXIT" as const, isActive: true },
      gateId,
    });
  },

  loadGateMode: async () => {
    try {
      const authStore = useAuthStore.getState();
      const res = await fetchWithTimeout("/api/operator/mode", {
        cache: "no-store",
        headers: authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {},
      }, 5000);
      if (!res.ok) return; // transient — keep last-known value
      const json = await res.json();
      const mode: GateMode = json?.data?.mode ?? json?.mode ?? "OPEN";
      if (get().gateMode !== mode) set({ gateMode: mode });
    } catch {
      // Network hiccup: keep the previous mode. A stale OPEN is safer than a
      // false MAINTENANCE that would block the desk; the next tick corrects.
    }
  },

  loadLockdown: async () => {
    try {
      const authStore = useAuthStore.getState();
      const res = await fetchWithTimeout("/api/lockdown/active", {
        cache: "no-store",
        headers: authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {},
      }, 5000);
      if (!res.ok) return;
      const json = await res.json();
      const raw = json?.data ?? json ?? null;
      const next: LockdownInfo | null = raw
        ? { id: raw.id, scopes: raw.scopes ?? [], message: raw.message ?? null }
        : null;
      const wasActive = get().lockdown !== null;
      if (!next) set({ lockdown: null, lockdownDismissed: false });
      else if (!wasActive) set({ lockdown: next, lockdownDismissed: false });
      else set({ lockdown: next }); // refresh scopes/message, keep dismissal
    } catch {
      // keep last-known lockdown state
    }
  },  dismissLockdown: () => {
    if (get().lockdown) set({ lockdownDismissed: true });
  },  overrideGateMode: async (mode, reason) => {
    const authStore = useAuthStore.getState();
    const res = await fetchWithTimeout(
      "/api/operator/mode",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {}),
        },
        body: JSON.stringify({ mode, reason }),
      },
      5000,
    );
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error?.message ?? body?.message ?? `Override failed (HTTP ${res.status})`);
    }
    set({ gateMode: mode }); // optimistic; next loadGateMode poll confirms
  },

}));
