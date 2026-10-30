"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2, Clock, Copy, Clock as ClockIcon,
  Lock, ShieldCheck,
} from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { SectionCard } from "@/components/admin/shared/SectionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { MEAL_LABEL, type MealType } from "@/lib/mess-reviews";

interface TokenData {
  created: boolean;
  token: {
    jti: string;
    qrToken: string;
    manualCode: string;
    itemIds: string[];
    itemLabels: string[];
    expiresAt: string;
  };
}

interface EventMeta {
  id: string;
  title: string;
  eventDate: string;
  mealType: MealType;
  servingStartAt: string;
  servingEndAt: string;
}

export function MyEventToken({ eventId }: { eventId: string }) {
  const addToast = useUIStore((s) => s.addToast);
  const [data, setData] = useState<TokenData | null>(null);
  const [meta, setMeta] = useState<EventMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const evRes = await fetch(`/api/mess/special-events`, { headers: getAuthHeaders(), cache: "no-store" });
      const evBody = await evRes.json().catch(() => null);
      const ev = (evBody?.data?.events ?? []).find((e: { id: string }) => e.id === eventId);
      if (!ev) throw new Error("Event not found");
      setMeta({
        id: ev.id,
        title: ev.title,
        eventDate: ev.eventDate,
        mealType: ev.mealType,
        servingStartAt: ev.servingStartAt,
        servingEndAt: ev.servingEndAt,
      });

      const tRes = await fetch(`/api/mess/special-events/${eventId}/token`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const tBody = await tRes.json().catch(() => null);
      if (!tRes.ok || tBody?.data == null) {
        throw new Error(tBody?.message ?? "Could not load token");
      }
      setData(tBody.data as TokenData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load token");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { void load(); }, [load]);

  const copyCode = async () => {
    if (!data?.token.manualCode) return;
    try {
      await navigator.clipboard.writeText(data.token.manualCode);
      addToast({ message: "Code copied", variant: "success" });
    } catch {
      addToast({ message: "Copy failed", variant: "error" });
    }
  };

  const downloadQr = () => {
    // QR removed — showing only manual code now.
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  if (error || !data || !meta) {
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
        {error ?? "Could not load token"}
        <Link href="/student/mess" className="ml-2 underline">Back</Link>
      </div>
    );
  }

  const expired = new Date(data.token.expiresAt).getTime() < Date.now();

  return (
    <WidgetBoundary title="My meal token">
      <SectionCard title={meta.title} description={`${meta.eventDate} · ${MEAL_LABEL[meta.mealType]}`}>
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] p-4">
            <div className="mb-2 text-xs uppercase tracking-wide text-[var(--text-muted)]">Manual code</div>
            <div className="flex items-center gap-3">
              <div className="font-mono text-4xl tracking-[0.35em] text-[var(--text-primary)] font-black">
                {data.token.manualCode || "••••••"}
              </div>
              <button
                type="button"
                onClick={() => void copyCode()}
                disabled={!data.token.manualCode}
                className="inline-flex items-center rounded-md border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-secondary)] disabled:opacity-50"
                aria-label="Copy code"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              {data.token.manualCode
                ? "Show this code at the mess counter. It works even if you don't have your phone."
                : "Your code was shown once when you first got the token. Ask the mess in-charge to re-issue it if you've lost it."}
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border)] p-3">
            <div className="mb-1 text-xs uppercase tracking-wide text-[var(--text-muted)]">Your items</div>
            <ul className="space-y-1 text-sm text-[var(--text-primary)]">
              {data.token.itemLabels.map((label, i) => (
                <li key={data.token.itemIds[i]} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" /> {label}
                </li>
              ))}
            </ul>
          </div>

          {expired && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300">
              <Lock className="mr-1 inline h-3 w-3" /> This token has expired.
            </div>
          )}

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-300">
            <ShieldCheck className="mr-1 inline h-3 w-3" />
            Single-use. Once served, it cannot be reused.
          </div>
        </div>
      </SectionCard>
    </WidgetBoundary>
  );
}
