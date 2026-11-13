"use client";

import React, { useState, useEffect } from "react";
import { Clock, ShieldAlert, CheckCircle2, Calendar, AlertTriangle } from "lucide-react";
import { checkTimeBasedAccess } from "@/lib/access-control";

interface AccessRestrictionsProps {
  personType?: string;
  className?: string;
}

export function AccessRestrictions({ personType = "worker", className = "" }: AccessRestrictionsProps) {
  const [accessResult, setAccessResult] = useState(() => checkTimeBasedAccess(personType));
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
      setAccessResult(checkTimeBasedAccess(personType, now));
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [personType]);

  const isAllowed = accessResult.allowed;

  return (
    <div className={`p-5 rounded-2xl border ${isAllowed ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"} space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl ${isAllowed ? "bg-emerald-500/10 text-action-success" : "bg-amber-500/10 text-action-warning"}`}>
            {isAllowed ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-text-primary">
              Worker Time-Based Access Status
            </h3>
            <p className="text-xs text-text-muted">
              Real-time gate clearance status & shift window rule
            </p>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
            isAllowed
              ? "bg-emerald-500/15 text-action-success border-emerald-500/30"
              : "bg-amber-500/15 text-action-warning border-amber-500/30"
          }`}
        >
          {isAllowed ? "🟢 ACCESS ALLOWED" : "⚠️ ACCESS RESTRICTED"}
        </span>
      </div>

      {!isAllowed && accessResult.reason && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs font-medium text-action-warning">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{accessResult.reason}</span>
        </div>
      )}

      {/* Rules Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div className="p-3 rounded-xl bg-bg-surface border border-border space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted">
            <Clock className="w-3.5 h-3.5 text-action-primary" />
            Allowed Shift Hours
          </div>
          <p className="text-xs font-bold text-text-primary font-mono">
            06:00 AM - 10:00 PM
          </p>
        </div>

        <div className="p-3 rounded-xl bg-bg-surface border border-border space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted">
            <Calendar className="w-3.5 h-3.5 text-unit-c" />
            Working Days
          </div>
          <p className="text-xs font-bold text-text-primary">
            Monday – Saturday
          </p>
        </div>

        <div className="p-3 rounded-xl bg-bg-surface border border-border space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted">
            <Clock className="w-3.5 h-3.5 text-action-success" />
            Current System Time
          </div>
          <p className="text-xs font-bold text-text-primary font-mono">
            {currentTime || "Loading..."}
          </p>
        </div>
      </div>
    </div>
  );
}
