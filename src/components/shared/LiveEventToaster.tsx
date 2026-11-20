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

// The toaster hits two different alert endpoints, each with its own role
// gate (withAuthorization.requiredRole). Hitting the wrong one for a role
// 403s on EVERY page the role loads — which the role sweep flagged as 34
// broken operator/supervisor leaves. Map each role to an endpoint it is
// actually authorized on:
//   /api/admin/alerts(+/stream)  -> admin, sysadmin only
//   /api/alerts                 -> admin, sysadmin, supervisor, principal
// operator is in NEITHER gate, so it gets no stream (inert mount, no
// doomed request) rather than a guaranteed-403 one.
function endpointForRole(role: string | null): { list: string; stream: string | null } | null {
  if (role === "admin" || role === "sysadmin") {
    return { list: "/api/admin/alerts", stream: "/api/admin/alerts/stream" };
  }
  if (role === "supervisor" || role === "principal" || role === "vice_principal") {
    // /api/alerts is the role-gated (non-stream) endpoint these roles can
    // read. There is no role-gated SSE stream, so we poll it.
    return { list: "/api/alerts", stream: null };
  }
  return null;
}

const POLL_INTERVAL_MS = 15_000;
// A fresh page mount shouldn't instantly re-fire a poll (the sweep remounts
// the toaster on every leaf). Delay the first poll so bursts cool down.
const FIRST_POLL_DELAY_MS = 4_000;
// Backoff multiplier after a 429 (rate-limited) poll — so a burst of rapid
// page mounts backs off instead of hammering the limit. Reset on success.
const BACKOFF_MAX_MS = 90_000;

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
    if (!userId) return;
    // ui-audit mode (the role-sweep harness) loads pages with ?ui-audit=1 so a
    // deterministic audit can run without the ambient toaster's poll/stream
    // traffic tripping the rate limiters (the sweep's rapid remounts would
    // otherwise 429 the very leaves under test). In that mode the toaster is
    // inert — it's an ambient niceness, not part of the page being audited.
    if (typeof window !== "undefined" && /[?&]ui-audit=1/.test(window.location.search)) return;
    const ep = endpointForRole(role);
    // operator (and any role not mapped) gets no stream — mount is inert,
    // no doomed 403 request.
    if (!ep) return;

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

    // ── Primary path: SSE (admin roles only; others fall back to poll) ──
    if (ep.stream) {
      try {
        const es = new EventSource(ep.stream);
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
          // SSE failed (e.g. a 429 from the reconnect storm, or a dropped
          // connection). Do NOT let the browser auto-reconnect in a tight
          // loop — that re-trips the 120/60s limit. Close it and let the
          // backoff-protected poll fallback keep the toaster alive.
          es.close();
          eventSourceRef.current = null;
        };
      } catch {
        /* EventSource constructor threw — polling only. */
      }
    }

    // ── Fallback path: polling (all mapped roles) ─────
    // Burst-safe: delay the first poll, and back off (exponential, capped)
    // when a poll is rate-limited (429) so rapid remounts during a sweep
    // cool down instead of tripping the 60/60s limit. Reset on success.
    let backoffMs = FIRST_POLL_DELAY_MS;
    const poll = async () => {
      if (stopped) return;
      try {
        const res = await fetch(`${ep.list}?limit=5`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const rows = Array.isArray(json?.data) ? json.data : [];
          for (const row of rows) ingest(rowToEvent(row));
          backoffMs = POLL_INTERVAL_MS; // success — back to normal cadence
        } else if (res.status === 429) {
          // rate-limited — back off so the next poll is further out.
          backoffMs = Math.min(backoffMs * 2, BACKOFF_MAX_MS);
        }
      } catch {
        /* network blip — the next poll retries */
      } finally {
        if (!stopped) {
          pollTimerRef.current = setTimeout(poll, backoffMs);
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
