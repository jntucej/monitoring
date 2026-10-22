"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import {
  SPECIAL_CATEGORIES, MEAL_LABEL,
  effectiveEventStatus, canIssueToken, countdownLabel,
  type SpecialEvent, type SpecialItemCategory,
} from "@/lib/mess-reviews";

const CAT_TONE = Object.fromEntries(
  SPECIAL_CATEGORIES.map((c) => [c.value, c.tone]),
) as Record<SpecialItemCategory, string>;
const CAT_LABEL = Object.fromEntries(
  SPECIAL_CATEGORIES.map((c) => [c.value, c.label]),
) as Record<SpecialItemCategory, string>;

export function SpecialItemSelector() {
  const addToast = useUIStore((s) => s.addToast);
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, Set<string>>>({});
  const [savingEventId, setSavingEventId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mess/special-events", { headers: getAuthHeaders(), cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.data == null) throw new Error(body?.message ?? "Failed to load events");
      const list: SpecialEvent[] = body.data.events ?? [];
      setEvents(list);
      setSelections((prev) => {
        const next: Record<string, Set<string>> = {};
        for (const ev of list) next[ev.id] = new Set(prev[ev.id] ?? ev.myItemIds);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggle = (eventId: string, itemId: string) => {
    setSelections((prev) => {
      const set = new Set(prev[eventId] ?? []);
      if (set.has(itemId)) set.delete(itemId);
      else set.add(itemId);
      return { ...prev, [eventId]: set };
    });
  };

  const save = async (ev: SpecialEvent) => {
    setSavingEventId(ev.id);
    try {
      const itemIds = Array.from(selections[ev.id] ?? []);
      const res = await fetch(`/api/mess/special-events/${ev.id}/interests`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.data == null) throw new Error(body?.message ?? "Save failed");
      addToast({ message: "Your selection is saved", variant: "success" });
      setEvents((prev) => prev.map((e) => e.id === ev.id ? { ...e, myItemIds: itemIds } : e));
    } catch (e) {
      addToast({ message: e instanceof Error ? e.message : "Save failed", variant: "error" });
    } finally {
      setSavingEventId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
        {error}
        <button type="button" onClick={() => void load()} className="ml-2 underline">Retry</button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        title="No special items yet"
        description="Your mess in-charge will announce special items ahead of the event."
        icon={<Sparkles className="h-8 w-8" />}
      />
    );
  }

  return (
    <WidgetBoundary title="Special Items">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Special Items</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Choose the special items you want. You can change your selection until the deadline.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {events.map((ev) => {
          const status = effectiveEventStatus(ev);
          const open = status === "OPEN";
          const selected = selections[ev.id] ?? new Set<string>();
          const canGetToken = canIssueToken(ev);
          const grouped = ev.items.reduce<Record<SpecialItemCategory, typeof ev.items>>(
            (acc, it) => {
              (acc[it.category] ??= []).push(it);
              return acc;
            },
            { VEG: [], NON_VEG: [], SWEET: [], OTHER: [] },
          );

          return (
            <div key={ev.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">{ev.title}</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {ev.eventDate} · {MEAL_LABEL[ev.mealType]}
                    {ev.notes ? ` · ${ev.notes}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
                    open ? "border-emerald-500/40 text-emerald-300" : "border-slate-500/40 text-slate-400"
                  }`}>
                    <Clock className="h-3 w-3" />
                    {open ? countdownLabel(ev.interestDeadline) : status}
                  </span>
                </div>
              </div>

              {(Object.keys(grouped) as SpecialItemCategory[]).map((cat) =>
                grouped[cat].length === 0 ? null : (
                  <div key={cat} className="mb-3">
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      {CAT_LABEL[cat]}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {grouped[cat].map((it) => {
                        const isOn = selected.has(it.id);
                        return (
                          <button
                            key={it.id}
                            type="button"
                            disabled={!open}
                            onClick={() => toggle(ev.id, it.id)}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                              isOn ? CAT_TONE[cat] : "border-[var(--border)] text-[var(--text-secondary)]"
                            } ${!open ? "opacity-60" : "hover:brightness-110"}`}
                          >
                            {isOn ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border border-current" />}
                            {it.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ),
              )}

              {open && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">{selected.size} selected</span>
                  <button
                    type="button"
                    disabled={savingEventId === ev.id}
                    onClick={() => void save(ev)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--action-primary)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {savingEventId === ev.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Save selection
                  </button>
                </div>
              )}

              {canGetToken && ev.myItemIds.length > 0 && (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2">
                  <div className="text-xs text-[var(--text-secondary)]">
                    Serving window is open. Get your token to redeem your meal.
                  </div>
                  <Link
                    href={`/student/mess/token/${ev.id}`}
                    className="rounded-md bg-emerald-500/90 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Get token →
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </WidgetBoundary>
  );
}
