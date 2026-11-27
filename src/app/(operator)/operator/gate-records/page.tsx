"use client";
/**
 * Operator gate-records console.
 *
 * Renders the blueprint-driven GateEventForm for each event type tab and a
 * live IN/OUT feed pulled from the existing /api/gate/stream SSE bus.
 * This is the UI half of the gate-records subsystem; the data half lives in
 * src/lib/gate/{blueprints,events,sse}.ts and the API in /api/gate/events.
 */
import { Suspense, useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { GateEventForm } from "@/components/gate/GateEventForm";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Loader2, Radio } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";

type EventType =
  | "movement"
  | "visitor"
  | "pass"
  | "exception"
  | "vehicle"
  | "device"
  | "shift";

const EVENT_TABS: { id: EventType; label: string; gateType: string }[] = [
  { id: "movement", label: "Movement", gateType: "main" },
  { id: "visitor", label: "Visitor", gateType: "main" },
  { id: "pass", label: "Pass", gateType: "main" },
  { id: "exception", label: "Exception", gateType: "main" },
  { id: "vehicle", label: "Vehicle", gateType: "vehicle" },
  { id: "device", label: "Device", gateType: "main" },
  { id: "shift", label: "Shift", gateType: "main" },
];

interface LiveEvent {
  id: string;
  eventType: string;
  outcome: string;
  occurredAt: string;
  gateId?: string;
  derived?: Record<string, unknown>;
}

function GateRecordsConsole() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? "operator";
  const gateId = user?.gateId ?? "";
  const [activeTab, setActiveTab] = useState<EventType>("movement");
  const [lastRecorded, setLastRecorded] = useState<LiveEvent | null>(null);
  const [liveFeed, setLiveFeed] = useState<LiveEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const activeEvent = EVENT_TABS.find((t) => t.id === activeTab)!;

  // Subscribe to the live gate stream (existing SSE bus) for the feed.
  useEffect(() => {
    if (!gateId) return;
    const es = new EventSource(`/api/gate/stream?gateId=${gateId}`);
    const onGateEvent = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === "gate_event" && data.gateId === gateId) {
          const evt: LiveEvent = {
            id: data.eventId,
            eventType: data.eventType,
            outcome: data.outcome,
            occurredAt: data.occurredAt,
            gateId: data.gateId,
            derived: data.derived,
          };
          setLiveFeed((prev) => [evt, ...prev].slice(0, 20));
        }
      } catch {
        /* ignore malformed frames */
      }
    };
    es.addEventListener("gate_event", onGateEvent);
    return () => es.close();
  }, [gateId]);

  const handleRecord = useCallback(
    async (payload: Record<string, unknown>) => {
      setError(null);
      const body = {
        gateId,
        gateType: activeEvent.gateType,
        eventType: activeEvent.id,
        context: "default",
        direction:
          payload.direction ?? (activeEvent.id === "vehicle" ? "IN" : "NA"),
        subjectType: activeEvent.id === "visitor" ? "visitor" : undefined,
        subjectRef:
          (payload.subject_scan as string | undefined) ??
          (payload.plate as string | undefined) ??
          (payload.candidate_id as string | undefined) ??
          (payload.resident_id as string | undefined) ??
          (payload.subject_ref as string | undefined),
        payload,
      };
      const res = await fetch("/api/gate/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setLastRecorded({
        id: data.event?.id ?? data.id,
        eventType: activeEvent.id,
        outcome: data.outcome ?? "recorded",
        occurredAt: new Date().toISOString(),
        derived: data.derived,
      });
    },
    [activeEvent, gateId]
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 space-y-4 py-6 min-w-0">
      <PageHeader
        title="Gate Records"
        subtitle="Record gate events with the role-scoped field blueprint; auto-derived fields are read-only"
      />
      <ContextSituationBar
        roleLabel="Gate Operator"
        purpose="Log movement, visitors, passes, exceptions, vehicles, devices, and shifts"
        contextLabel="Gate Records Console"
        statusSummary={
          lastRecorded
            ? `Last recorded: ${lastRecorded.eventType} (${lastRecorded.outcome})`
            : "Ready to record"
        }
        severity="ok"
      />

      {/* Event-type tabs + Blueprint-driven form */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          if (val) setActiveTab(val as EventType);
        }}
      >
        <Tabs.List className="flex flex-wrap gap-1.5 p-0 bg-transparent rounded-none">
          {EVENT_TABS.map((t) => (
            <Tabs.Tab
              key={t.id}
              value={t.id}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === t.id
                  ? "bg-action-primary text-bg-surface"
                  : "bg-bg-elevated text-text-secondary hover:bg-bg-elevated/80"
              }`}
            >
              {t.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        <Tabs.Panel value={activeTab} className="pt-2">
          <div className="surface-card bg-bg-surface p-4 sm:p-5 space-y-3 min-w-0">
            <GateEventForm
              key={activeTab}
              role={role}
              gateType={activeEvent.gateType}
              eventType={activeEvent.id}
              context="default"
              autoLoad
              onSubmit={handleRecord}
            />
            {error && (
              <p className="text-sm text-action-danger" role="alert">
                {error}
              </p>
            )}
            {lastRecorded && !error && (
              <p className="text-sm text-action-primary">
                Recorded {lastRecorded.eventType} — outcome {lastRecorded.outcome}
              </p>
            )}
          </div>
        </Tabs.Panel>
      </Tabs>

      {/* Live IN/OUT feed */}
      <div className="surface-card bg-bg-surface p-4 sm:p-5 min-w-0">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-text-primary">
          <Radio className="size-4 text-action-primary" aria-hidden />
          Live feed ({gateId ? "this gate" : "unassigned"})
        </div>
        {liveFeed.length === 0 ? (
          <p className="text-sm text-text-muted">
            No recent events on this gate yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {liveFeed.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-mono text-xs text-text-muted">
                  {new Date(e.occurredAt).toLocaleTimeString("en-IN")}
                </span>
                <span className="text-text-primary">{e.eventType}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    e.outcome === "held"
                      ? "bg-action-warning/15 text-action-warning"
                      : e.outcome === "escalated"
                        ? "bg-action-danger/15 text-action-danger"
                        : "bg-action-primary/15 text-action-primary"
                  }`}
                >
                  {e.outcome}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function GateRecordsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Loader2 className="size-4 animate-spin" />
        <span>Loading gate records console…</span>
      </div>
    </div>
  );
}

export default function GateRecordsPage() {
  return (
    <Suspense fallback={<GateRecordsSkeleton />}>
      <GateRecordsConsole />
    </Suspense>
  );
}
