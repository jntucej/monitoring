"use client";

/**
 * EventCard — a single campus event with a Register button.
 * Registration calls POST /api/campus/events/[id]/register (idempotent,
 * authenticated-only) and reflects the resulting state locally.
 */
import { useState } from "react";
import {
  CalendarDays,
  MapPin,
  Users,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import type { CampusEvent } from "@/lib/engagement";

type RegistrationState = "idle" | "pending" | "registered" | "error";

function formatEventWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EventCard({
  event,
  onChanged,
}: {
  event: CampusEvent;
  onChanged?: () => void;
}) {
  const [state, setState] = useState<RegistrationState>(
    event.isRegistered ? "registered" : "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  const isFull =
    event.capacity !== null &&
    event.capacity >= 0 &&
    event.registrations >= event.capacity;

  async function handleRegister() {
    if (state === "pending" || state === "registered") return;
    setState("pending");
    setMessage(null);
    try {
      const res = await fetch(
        `/api/campus/events/${encodeURIComponent(event.id)}/register`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          cache: "no-store",
        }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(
          (json?.error as { code?: string; message?: string } | undefined)
            ?.message ?? `Registration failed (${res.status})`
        );
      }
      setState("registered");
      setMessage(
        json.data.status === "already_registered"
          ? "You were already registered for this event."
          : "You're registered — see you there!"
      );
      onChanged?.();
    } catch (e) {
      setState("error");
      setMessage(e instanceof Error ? e.message : "Registration failed");
    }
  }

  const button = (() => {
    switch (state) {
      case "registered":
        return (
          <button
            type="button"
            disabled
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 motion-safe:transition-colors motion-reduce:transition-none disabled:cursor-default"
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Registered
          </button>
        );
      case "pending":
        return (
          <button
            type="button"
            disabled
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)] motion-reduce:transition-none"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
            Registering…
          </button>
        );
      case "error":
        return (
          <button
            type="button"
            onClick={() => void handleRegister()}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 motion-safe:transition-colors motion-reduce:transition-none"
          >
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            Retry registration
          </button>
        );
      default:
        return (
          <button
            type="button"
            disabled={isFull}
            onClick={() => void handleRegister()}
            className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold motion-safe:transition-colors motion-reduce:transition-none ${
              isFull
                ? "cursor-not-allowed border border-[var(--border)] bg-[var(--bg-raised)] text-[var(--text-muted)] opacity-60"
                : "border border-indigo-500/40 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
            }`}
          >
            {isFull ? "Event full" : "Register"}
            {!isFull && <ArrowRight className="h-3.5 w-3.5" aria-hidden />}
          </button>
        );
    }
  })();

  return (
    <article
      aria-label={`Campus event: ${event.title}`}
      className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 min-w-0"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
            <CalendarDays className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-[var(--text-primary)]">
              {event.title}
            </h3>
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              {event.category}
            </p>
          </div>
        </div>
        {event.registrationStatus === "attended" && (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
            Attended
          </span>
        )}
      </div>

      {event.description && (
        <p className="mt-2 line-clamp-2 text-xs text-[var(--text-muted)]">
          {event.description}
        </p>
      )}

      <div className="mt-3 space-y-1.5 text-[11px] text-[var(--text-muted)]">
        <p className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {formatEventWhen(event.startsAt)}
        </p>
        {event.location && (
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {event.location}
          </p>
        )}
        <p className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {event.registrations} registered
          {event.capacity !== null && event.capacity >= 0
            ? ` of ${event.capacity}`
            : ""}
        </p>
      </div>

      <div className="mt-4 pt-1">
        {button}
        {message && (
          <p
            className={`mt-2 text-center text-[11px] ${
              state === "error" ? "text-rose-300" : "text-[var(--text-muted)]"
            }`}
            role={state === "error" ? "alert" : "status"}
          >
            {message}
          </p>
        )}
      </div>
    </article>
  );
}
