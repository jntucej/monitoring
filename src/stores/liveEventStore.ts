// src/stores/liveEventStore.ts
// ─────────────────────────────────────────────────────────────────────────────
// Bounded in-memory buffer of live campus events, shared between the
// LiveEventToaster (SSE/polling source) and the LiveEventsPanel widget
// (overview of each recent event). Deliberately NOT persisted: events are
// transient signal, not state worth surviving a reload.
//
// The store keeps the most recent MAX_EVENTS items and tracks a per-event
// "seen" flag so the panel can highlight what just arrived. No RLS impact —
// this is purely client-side UI state; data still flows in from the
// existing /api/admin/alerts + /api/admin/alerts/stream endpoints.
// ─────────────────────────────────────────────────────────────────────────────
import { create } from "zustand";

export type LiveEventKind = "alert" | "gate" | "scan" | "system";

export interface LiveEvent {
  id: string;
  kind: LiveEventKind;
  title: string;
  detail?: string;
  severity?: "critical" | "high" | "medium" | "low" | "info";
  at: string; // ISO timestamp
  /** True for the first N events that have not yet been dismissed as "new". */
  fresh: boolean;
}

const MAX_EVENTS = 20;
const FRESH_TTL_MS = 8_000;

interface LiveEventState {
  events: LiveEvent[];
  /** Total distinct events observed since mount (for the "live" counter). */
  totalSeen: number;
  lastEventAt: string | null;
  addEvent: (e: Omit<LiveEvent, "fresh">) => void;
  ageFresh: () => void;
  clear: () => void;
}

let lastSeenId: string | null = null;

export const useLiveEventStore = create<LiveEventState>((set, get) => ({
  events: [],
  totalSeen: 0,
  lastEventAt: null,

  addEvent: (e) => {
    // De-dupe: the SSE stream can replay an event on reconnect; the ring
    // buffer already handles replay server-side, but guard anyway.
    if (e.id && e.id === lastSeenId) return;
    lastSeenId = e.id;
    set((s) => ({
      events: [
        { ...e, fresh: true },
        ...s.events.filter((x) => x.id !== e.id),
      ].slice(0, MAX_EVENTS),
      totalSeen: s.totalSeen + 1,
      lastEventAt: e.at,
    }));
    // Auto-demote `fresh` after the TTL so the panel highlight decays.
    window.setTimeout(() => get().ageFresh(), FRESH_TTL_MS);
  },

  ageFresh: () =>
    set((s) => ({
      events: s.events.map((e) => (e.fresh ? { ...e, fresh: false } : e)),
    })),

  clear: () => set({ events: [], totalSeen: 0, lastEventAt: null }),
}));
