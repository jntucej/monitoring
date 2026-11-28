"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, QrCode } from "lucide-react";
import type { StudentState } from "@/hooks/useStudentState";

/**
 * ActivePassQrCard — the pinned, offline-first outing pass card.
 *
 * Renders the active gate pass QR (from /api/student/state) with a live
 * curfew countdown driven by deadlineWatchDueAt. The QR token is persisted
 * to localStorage so the pass still renders on a weak hostel-gate network.
 *
 * Privacy: only the student's own pass + a static QR token — no GPS, no
 * geofence, no biometric reader state.
 */

const LS_KEY = "student_active_pass_qr";

export interface ActivePassQrCardProps {
  state: StudentState;
}

function usePassPersistence(state: StudentState) {
  const p = state.gate.activePass;
  if (p) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ ...p, savedAt: Date.now() }));
    } catch { /* storage full / SSR — best-effort */ }
  }
  return p;
}

function useCountdown(dueAt: string | null): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!dueAt) return "";
  const ms = new Date(dueAt).getTime() - now;
  if (ms <= 0) return "Overdue";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

export function ActivePassQrCard({ state }: ActivePassQrCardProps) {
  const activePass = usePassPersistence(state);

  // Fallback to the persisted copy if the live call returned nothing.
  let pass = activePass;
  if (!pass) {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (new Date(cached.to).getTime() > Date.now()) pass = cached;
      }
    } catch { /* ignore */ }
  }

  if (!pass) return null;

  const due = pass.deadlineWatchDueAt ?? pass.to;
  const countdown = useCountdown(due);

  return (
    <Card className="w-full border-sky-500/40 bg-sky-50/40">
      <CardHeader>
        <div className="flex w-full items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="h-4 w-4 text-sky-600" />
            Active Pass — {pass.reason || "Gate Pass"}
          </CardTitle>
          <Badge variant="dayout" dot={false}>
            {pass.status.replace(/_/g, " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4">
          <div className="rounded-lg border border-border bg-white p-2">
            <QRCodeCanvas value={pass.qrCode || pass.id} size={96} />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5 text-sm">
            <div className="flex items-center gap-1.5 text-text-secondary">
              <Clock className="h-4 w-4 shrink-0" />
              <span className="truncate">
                Until{" "}
                {new Date(due).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div
              className={
                "text-sm font-medium " +
                (countdown === "Overdue" ? "text-rose-600" : "text-amber-700")
              }
            >
              {countdown}
            </div>
            <p className="text-xs text-text-secondary">
              Flash this at the gate. Offline copy is saved on this device.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
