// src/components/shared/LiveEventToaster.tsx
// ─────────────────────────────────────────────────────────────────────────────
// LiveEventToaster — subscribes to the admin alerts SSE stream (falling
// back to 15-second polling if the stream is unavailable) and, when a new
// alert or gate event arrives:
//   1. pushes it into the shared useLiveEventStore (so a LiveEventsPanel
//      widget can render the running overview), and
//   2. fires a one-shot toast (severity-mapped variant) so the operator /
//      admin gets an immediate, glanceable "something just happened" cue.
//
// Why a separate toaster and not the NotificationCenter?
//   The NotificationCenter is a *list* the user opens on demand. The
//   toaster is *ambient*: it is the "new notification that updates those
//   things" the UI audit asked for — it reacts to state change, not to the
//   user asking for state. The two coexist: the panel shows history, the
//   toaster shows the live edge.
//
// Roles: only fires for roles where /api/admin/alerts/stream is meaningful
// (admin, sysadmin, operator, supervisor). Every other role mounts it
// inert — no doomed request, no console noise.
//
// Mount point: ClientProviders (inside ToastProvider, after auth store
// hydrates) so it is available on every console shell without touching each
// shell's top bar.
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { useEffect, useRef } from "react";
import { useAuthStore, useHasHydrated } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { useLiveEventStore, type LiveEvent } from "@/stores/liveEventStore";
import type { ToastVariant } from "@/components/ui/toast";

const ACTIVE_ROLES = new Set([
  "admin",
  "sysadmin",
  "operator",
  "supervisor",
  "vice_principal",
  "principal",
]);

const POLL_INTERVAL_MS = 15_000;

function severityToVariant(sev: LiveEvent["severity"]): ToastVariant {
  switch (sev) {
    case "critical":
    case "high":
      return "warning";
    case "medium":
      return "info";
    case "low":
    case "info":
      return "info";
    default:
      return "info";
  }
}

/** Normalise a raw /api/admin/alerts row into a LiveEvent. */
function rowToEvent(row: Record<string, unknown>): LiveEvent {
  const at =
    (row.createdAt as string) ||
    (row.timestamp as string) ||
    new Date().toISOString();
  const title =
    (row.title as string) ||
    (row.message as string) ||
    `Gate alert ${row.id ?? ""}`.trim();
  return {
    id: String(row.id ?? `${title}-${at}`),
    kind: "alert",
    title,
    detail: (row.message as string) || undefined,
    severity: (row.severity as LiveEvent["severity"]) ?? "info",
    at,
    fresh: true,
  };
}

export function LiveEventToaster() {
  const role = useAuthStore((s) => s.user?.role ?? null);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const hydrateState = useHasHydrated();
  const addToast = useUIStore((s) => s.addToast);
  const addEvent = useLiveEventStore((s) => s.addEvent);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hydrateState) return;
    if (!ACTIVE_ROLES.has(role ?? "") || !userId) return;

    let stopped = false;

    const ingest = (event: LiveEvent) => {
      // Skip anything we've already toasted (dedupe across stream + poll).
      if (seenIdsRef.current.has(event.id)) return;
      seenIdsRef.current.add(event.id);
      addEvent(event);
      addToast({
        variant: severityToVariant(event.severity),
        title: "Live campus event",
        message: event.title,
        duration: event.severity === "critical" || event.severity === "high" ? 8000 : 5000,
      });
    };

    // ── Primary path: SSE ────────────────────────────────────────────────
    const streamUrl = `/api/admin/alerts/stream`;
    try {
      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;
      es.onmessage = (m) => {
        try {
          const parsed = JSON.parse(m.data);
          if (parsed && parsed.id) ingest(rowToEvent(parsed));
        } catch {
          /* malformed frame — ignore, don't break the stream */
        }
      };
      es.onerror = () => {
        // SSE failed — the poll fallback below keeps working. We do not
        // re-open the EventSource (the browser auto-reconnects).
      };
    } catch {
      // EventSource constructor threw — polling only.
    }

    // ── Fallback path: polling (also runs in parallel for safety) ───────
    const poll = async () => {
      if (stopped) return;
      try {
        const res = await fetch("/api/admin/alerts?limit=5", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const rows = Array.isArray(json?.data) ? json.data : [];
          for (const row of rows) ingest(rowToEvent(row));
        }
      } catch {
        /* network blip — the next poll retries */
      } finally {
        if (!stopped) {
          pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      }
    };
    poll();

    return () => {
      stopped = true;
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      // Copy to a local so the cleanup captures the current ref value, not
      // a live binding that may have been replaced.
      const seen = seenIdsRef.current;
      seen.clear();
    };
  }, [role, userId, hydrateState, addEvent, addToast]);

  // Mount is inert for unsupported roles (no visible element — the panel
  // still renders, it just stays empty until the user reaches a role that
  // is served by the stream).
  return null;
}

export default LiveEventToaster;
