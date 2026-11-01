"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { Ticket, ArrowRight, QrCode } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { getAuthHeaders } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardPayload {
  activePasses: Array<{
    id: string;
    reason: string;
    from: string;
    to: string;
    qrCode?: string;
    status?: string;
  }>;
}

interface QrResponse {
  token: string;
  qrText: string;
}

export function ActivePassCard() {
  const { data, loading } = useApiResource<DashboardPayload>("/api/student/dashboard", {
    ttlMs: 20_000,
  });
  const passes = (data?.activePasses ?? []).filter((p) => p.status === "APPROVED");
  const single = passes.length === 1 ? passes[0] : null;

  // Exactly one active pass → fetch the short-lived signed QR token
  // (/api/permissions/[ticket]/qr returns { token, qrText }; the scanner
  // accepts the `mycampus:pass:<token>` payload, so we encode qrText).
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!single) return;
    let cancelled = false;
    const fetchQr = () => {
      fetch(`/api/permissions/${encodeURIComponent(single.id)}/qr`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: QrResponse | null) => {
          if (!cancelled && j?.qrText) setQr(j.qrText);
        })
        .catch(() => {});
    };
    fetchQr();
    // Token TTL is 15 min; refresh at 12 min.
    const id = setInterval(fetchQr, 12 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [single?.id, single]);

  if (loading) return <Skeleton className="h-40 w-full rounded-2xl" />;

  if (passes.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <Ticket className="h-5 w-5" aria-hidden />
          <span className="text-sm">No active pass</span>
        </div>
        <Link
          href="/student/permissions/new"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--action-primary)]"
        >
          Apply for one <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    );
  }

  if (passes.length > 1) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
        <div className="flex items-center gap-2 text-[var(--text-primary)]">
          <Ticket className="h-5 w-5" aria-hidden />
          <span className="text-sm font-medium">
            You have {passes.length} active passes
          </span>
        </div>
        <Link
          href="/student/passes"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--action-primary)]"
        >
          See all <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    );
  }

  // Single pass — inline QR.
  return (
    <div className="rounded-2xl border border-[var(--action-primary)]/40 bg-[var(--bg-surface)] p-4">
      <div className="mb-2 flex items-center gap-2">
        <QrCode className="h-4 w-4 text-[var(--action-primary)]" aria-hidden />
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {single!.reason}
        </span>
      </div>
      {qr ? (
        <div className="flex justify-center rounded-xl bg-white p-3">
          <QRCodeCanvas value={qr} size={180} level="M" />
        </div>
      ) : (
        <Skeleton className="h-44 w-full rounded-xl" />
      )}
      <Link
        href={`/student/passes/${encodeURIComponent(single!.id)}`}
        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--action-primary)]"
      >
        Details <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
