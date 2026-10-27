"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { SectionCard } from "@/components/admin/shared/SectionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import {
  MEAL_LABEL, MEAL_TYPES, SPECIAL_CATEGORIES,
  effectiveEventStatus,
  type MealType, type SpecialEvent, type SpecialItemCategory,
} from "@/lib/mess-reviews";
import { InterestCountsPanel } from "./InterestCountsPanel";

interface DraftItem { code: string; label: string; category: SpecialItemCategory; isPrimary: boolean }
const emptyItem = (): DraftItem => ({ code: "", label: "", category: "VEG", isPrimary: false });

function istToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}
function defaultAnnouncement(dateIso: string): string {
  const ms = new Date(`${dateIso}T00:00:00+05:30`).getTime() - 2 * 86_400_000 + 9 * 3_600_000;
  return new Date(ms).toISOString().slice(0, 16);
}
function defaultDeadline(dateIso: string): string {
  const ms = new Date(`${dateIso}T00:00:00+05:30`).getTime() - 86_400_000 + 18 * 3_600_000;
  return new Date(ms).toISOString().slice(0, 16);
}

export function SpecialEventManager() {
  const addToast = useUIStore((s) => s.addToast);
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  const today = istToday();
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState(today);
  const [mealType, setMealType] = useState<MealType>("LUNCH");
  const [announcementAt, setAnnouncementAt] = useState(defaultAnnouncement(today));
  const [interestDeadline, setInterestDeadline] = useState(defaultDeadline(today));
  const [notes, setNotes] = useState("");
  const [hostelOnly, setHostelOnly] = useState(true);
  const [items, setItems] = useState<DraftItem[]>([emptyItem(), emptyItem()]);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mess/special-events?upcomingOnly=1", {
        headers: getAuthHeaders(), cache: "no-store",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.data == null) throw new Error(body?.message ?? "Failed to load events");
      setEvents(body.data.events ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const updateItem = (idx: number, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return addToast({ message: "Title is required", variant: "error" });
    const clean = items.filter((it) => it.code.trim() && it.label.trim());
    if (clean.length === 0) return addToast({ message: "Add at least one item", variant: "error" });
    setSubmitting(true);
    try {
      const res = await fetch("/api/mess/special-events", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          title, eventDate, mealType,
          announcementAt: new Date(announcementAt).toISOString(),
          interestDeadline: new Date(interestDeadline).toISOString(),
          notes: notes || null,
          hostelOnly,
          items: clean.map((it, i) => ({ ...it, sortOrder: i })),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.data == null) throw new Error(body?.message ?? "Create failed");
      addToast({ message: "Special event created", variant: "success" });
      setTitle(""); setNotes(""); setItems([emptyItem(), emptyItem()]);
      await load();
    } catch (err) {
      addToast({ message: err instanceof Error ? err.message : "Create failed", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const setStatus = async (id: string, status: "SCHEDULED" | "CLOSED" | "CANCELLED") => {
    try {
      const res = await fetch(`/api/mess/special-events/${id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.data == null) throw new Error(body?.message ?? "Update failed");
      addToast({ message: `Event ${status.toLowerCase()}`, variant: "success" });
      await load();
    } catch (err) {
      addToast({ message: err instanceof Error ? err.message : "Update failed", variant: "error" });
    }
  };

  return (
    <WidgetBoundary title="Special events">
      <div className="space-y-6">
        <SectionCard title="Announce a special event" description="Students see it from the announcement time and can respond until the deadline.">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-[var(--text-secondary)]">
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-[var(--text-secondary)]">
              Event date
              <input type="date" value={eventDate} min={today}
                onChange={(e) => {
                  setEventDate(e.target.value);
                  setAnnouncementAt(defaultAnnouncement(e.target.value));
                  setInterestDeadline(defaultDeadline(e.target.value));
                }}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-[var(--text-secondary)]">
              Meal
              <select value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm">
                {MEAL_TYPES.map((m) => <option key={m} value={m}>{MEAL_LABEL[m]}</option>)}
              </select>
            </label>
            <label className="text-sm text-[var(--text-secondary)]">
              Notes (optional)
              <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-[var(--text-secondary)]">
              Announce at
              <input type="datetime-local" value={announcementAt}
                onChange={(e) => setAnnouncementAt(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-[var(--text-secondary)]">
              Interest deadline
              <input type="datetime-local" value={interestDeadline}
                onChange={(e) => setInterestDeadline(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
            </label>

            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] md:col-span-2">
              <input type="checkbox" checked={hostelOnly} onChange={(e) => setHostelOnly(e.target.checked)} />
              Hostel students only (day scholars are blocked from tokens)
            </label>

            <div className="md:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-secondary)]">Items</span>
                <button type="button" onClick={() => setItems((p) => [...p, emptyItem()])}
                  className="inline-flex items-center gap-1 text-xs text-[var(--action-primary)]">
                  <Plus className="h-3.5 w-3.5" /> Add item
                </button>
              </div>
              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <input value={it.code} onChange={(e) => updateItem(idx, { code: e.target.value.toUpperCase() })}
                      placeholder="CODE" maxLength={20}
                      className="col-span-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-xs font-mono" />
                    <input value={it.label} onChange={(e) => updateItem(idx, { label: e.target.value })}
                      placeholder="Label (e.g. Chicken Biryani)" maxLength={80}
                      className="col-span-5 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-xs" />
                    <select value={it.category} onChange={(e) => updateItem(idx, { category: e.target.value as SpecialItemCategory })}
                      className="col-span-3 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-xs">
                      {SPECIAL_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <label className="col-span-1 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                      <input type="checkbox" checked={it.isPrimary} onChange={(e) => updateItem(idx, { isPrimary: e.target.checked })} />
                      Primary
                    </label>
                    <button type="button" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                      className="col-span-1 text-rose-400 hover:text-rose-300" aria-label="Remove item">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <button type="submit" disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--action-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
                Create event
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Special events"
          description="Exact counts and per-student selections are shown when you open an event."
        >
          <div className="flex items-center justify-end mb-3">
            <button type="button" onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)]">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
          {loading && <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>}
          {error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}
          {!loading && !error && events.length === 0 && <p className="text-sm text-[var(--text-muted)]">No special events yet.</p>}
          <div className="space-y-2">
            {events.map((ev) => {
              const status = effectiveEventStatus(ev);
              return (
                <div key={ev.id} className="rounded-lg border border-[var(--border)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">{ev.title}</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {ev.eventDate} · {MEAL_LABEL[ev.mealType]} · {status}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => setActiveEventId(activeEventId === ev.id ? null : ev.id)}
                        className="rounded-md border border-[var(--border)] px-2 py-1 text-xs">
                        {activeEventId === ev.id ? "Hide counts" : "View counts"}
                      </button>
                      {status !== "CANCELLED" && (
                        <button type="button" onClick={() => void setStatus(ev.id, "CLOSED")}
                          className="rounded-md border border-[var(--border)] px-2 py-1 text-xs">Close</button>
                      )}
                      {status !== "CANCELLED" && (
                        <button type="button" onClick={() => void setStatus(ev.id, "CANCELLED")}
                          className="rounded-md border border-rose-500/40 px-2 py-1 text-xs text-rose-300">Cancel</button>
                      )}
                    </div>
                  </div>
                  {activeEventId === ev.id && (
                    <div className="mt-3">
                      <InterestCountsPanel eventId={ev.id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </WidgetBoundary>
  );
}
