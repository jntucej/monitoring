"use client";
// src/app/visitor/visit/page.tsx — the single "your visit" surface:
// live status + host + check-in/out CTA in one card. /visitor/visit-details
// and /visitor/checkin-out redirect here.

import { useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { getAuthHeaders } from "@/lib/utils";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { Clock, MapPin, Loader2 } from "lucide-react";

interface VisitorsMineResponse {
  success: boolean;
  data: {
    active: { status: string; log: Record<string, unknown> } | null;
    approvalStatus: {
      state: "ACTIVE" | "COMPLETED" | "NONE";
      checkedInAt: string | null;
      purpose: string | null;
    };
    visitDetails: {
      purpose: string | null;
      hostName: string | null;
      checkedInAt: string | null;
      checkedOutAt: string | null;
      status: string | null;
    };
    hostInfo: { name: string | null; uniqueId: string | null; role: string | null };
  };
}

export default function VisitorVisitPage() {
  const { data, loading, refresh } = useApiResource<VisitorsMineResponse>("/api/visitors/mine", {
    ttlMs: 30_000,
  });
  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (loading) return <PageLoading />;
  const d = data?.data;
  const state = d?.approvalStatus.state;

  if (!d || state === "NONE") {
    return (
      <WidgetBoundary name="visitor-visit">
        <div className="mx-auto max-w-md p-4">
          <EmptyState
            title="No visit"
            description="You don't have a visit today. Request one from your host to get started."
          />
        </div>
      </WidgetBoundary>
    );
  }

  const isActive = state === "ACTIVE" && !!d.active;
  const action = {
    label: isActive ? "Check out" : "Check in",
    endpoint: isActive ? "/api/visitors/me/check-out" : "/api/visitors/me/check-in",
  };

  const act = async () => {
    setActing(true);
    setMsg(null);
    try {
      const res = await fetch(action.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        refresh();
        setMsg(isActive ? "Checked out. Safe travels." : "Checked in. Enjoy your visit.");
      } else {
        const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        setMsg(j.error?.message ?? "Action failed. Please try again.");
      }
    } catch {
      setMsg("Network error. Please try again.");
    } finally {
      setActing(false);
    }
  };

  return (
    <WidgetBoundary name="visitor-visit">
      <div className="mx-auto max-w-md space-y-4 p-4">
        <h1 className="text-lg font-semibold">Your visit</h1>
        <div className="surface-card space-y-2 bg-bg-surface p-4">
          <p className="text-sm text-text-secondary">
            Host: <strong>{d.hostInfo.name ?? "—"}</strong>
          </p>
          <p className="text-sm text-text-secondary">
            Purpose: {d.visitDetails.purpose ?? "—"}
          </p>
          <p className="text-sm text-text-secondary">
            Status: {state === "ACTIVE" ? "Checked in" : "Completed"}
            {d.approvalStatus.checkedInAt && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-text-muted">
                <Clock className="size-3.5" />
                {new Date(d.approvalStatus.checkedInAt).toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={act}
          disabled={acting}
          className="surface-card flex w-full items-center justify-center gap-2 bg-action-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          {action.label}
        </button>
        {msg && <p className="text-center text-xs text-text-muted">{msg}</p>}
      </div>
    </WidgetBoundary>
  );
}
