"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";

interface DashboardPayload {
  lastScan: { direction: "IN" | "OUT"; timestamp: string } | null;
  curfew: { today: { score: number; late: number } };
}

type CurfewState = "none" | "late" | "not-returned";

function useCurfewState(): CurfewState {
  const { data } = useApiResource<DashboardPayload>("/api/student/dashboard", {
    ttlMs: 20_000,
  });
  return useMemo(() => {
    if (!data?.lastScan) return "none";
    const isOut = data.lastScan.direction === "OUT";
    const late = data.curfew?.today?.late ?? 0;
    const hour = new Date().getHours();
    const isEvening = hour >= 21 || hour < 6;
    if (isOut && isEvening) return "not-returned";
    if (late > 0) return "late";
    return "none";
  }, [data]);
}

export function ContextCard() {
  const curfew = useCurfewState();
  const addToast = useUIStore((s) => s.success);
  const [ackBusy, setAckBusy] = useState(false);
  const [ackDone, setAckDone] = useState(false);

  // The guardian endpoint returns { guardians: [{ guardianName, guardianRelation,
  // guardianPhoneLast4, … }] } — no raw phone (it is encrypted at rest), so
  // the tel: link only renders when a phone is actually available.
  const { data: guardianRes } = useApiResource<{
    guardians?: Array<{ guardianName: string | null }>;
  }>("/api/student/guardian", { ttlMs: 5 * 60_000 });
  const firstGuardian = guardianRes?.guardians?.[0];

  const acknowledge = async () => {
    setAckBusy(true);
    try {
      const res = await fetch("/api/student/curfew-acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ expectedMinutes: 15 }),
      });
      if (res.ok) {
        setAckDone(true);
        addToast("Warden notified — return within 15 minutes.");
      }
    } catch {
      /* keep the button retryable */
    } finally {
      setAckBusy(false);
    }
  };

  if (curfew === "none") {
    return (
      <div className="surface-card bg-bg-surface p-4">
        <div className="flex items-center gap-2 text-text-muted">
          <CheckCircle2 className="h-5 w-5" aria-hidden />
          <span className="text-sm">
            You&apos;re all clear. Nothing needs action right now.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card bgalert-warning/10 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle
          className="h-5 w-5 textalert-warning"
          aria-hidden
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-text-primary">
            {curfew === "not-returned"
              ? "You're outside after curfew."
              : "You were late today."}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {ackDone
              ? "Warden notified. Return within 15 minutes."
              : "Tap below to let your warden know you're on your way."}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button onClick={acknowledge} disabled={ackBusy || ackDone}>
          {ackBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            "I'm on my way"
          )}
        </Button>
        {firstGuardian?.guardianName ? (
          <span className="text-xs text-text-muted">
            Guardian: {firstGuardian.guardianName}
          </span>
        ) : null}
      </div>
    </div>
  );
}
