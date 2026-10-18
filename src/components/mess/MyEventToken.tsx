"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2, Clock, Copy, Download, Loader2, Lock, ShieldCheck,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { SectionCard } from "@/components/admin/shared/SectionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { MEAL_LABEL, countdownLabel, type MealType } from "@/lib/mess-reviews";

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
  const [showCode, setShowCode] = useState(false);

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
    const canvas = document.querySelector<HTMLCanvasElement>("#mess-token-qr canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `meal-token-${eventId.slice(0, 8)}.png`;
    a.click();
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
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-white p-4">
            <div id="mess-token-qr">
              <QRCodeCanvas value={data.token.qrToken} size={240} level="M" includeMargin />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Clock className="h-3 w-3" />
              Expires {countdownLabel(data.token.expiresAt)}
            </div>
            <button
              type="button"
              onClick={downloadQr}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
            >
              <Download className="h-3 w-3" /> Save QR
            </button>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-[var(--border)] p-3">
              <div className="mb-1 text-xs uppercase tracking-wide text-[var(--text-muted)]">Manual code</div>
              <div className="flex items-center gap-2">
                <div className="font-mono text-2xl tracking-[0.35em] text-[var(--text-primary)]">
                  {showCode ? (data.token.manualCode || "••••••") : "••••••"}
                </div>
                <button
                  type="button"
                  onClick={() => setShowCode((v) => !v)}
                  className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-secondary)]"
                >
                  {showCode ? "Hide" : "Show"}
                </button>
                <button
                  type="button"
                  onClick={() => void copyCode()}
                  disabled={!data.token.manualCode}
                  className="inline-flex items-center rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-secondary)] disabled:opacity-50"
                  aria-label="Copy code"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                {data.token.manualCode
                  ? "Save this code. It works if you don't have your phone at the counter."
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
        </div>
      </SectionCard>
    </WidgetBoundary>
  );
}
