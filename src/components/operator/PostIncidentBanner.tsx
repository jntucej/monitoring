"use client";

import React from "react";
import {
  ShieldAlert,
  PhoneCall,
  Navigation,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import type { LocationIncidentAlert } from "@/lib/security-post-dispatch";

export function PostIncidentBanner({
  incidents,
  onAcknowledge,
  onResolve,
}: {
  incidents: LocationIncidentAlert[];
  onAcknowledge: (incidentId: string) => void;
  onResolve: (incidentId: string) => void;
}) {
  const active = incidents.filter((i) => i.status !== "RESOLVED");
  if (active.length === 0) return null;

  return (
    <section
      data-testid="post-incident-banner"
      aria-label="Active location incidents at your post"
      className="space-y-2.5"
    >
      {active.map((inc) => {
        const isDistress = inc.severity === "distress";
        return (
          <div
            key={inc.id}
            className={`surface-card rounded-2xl border p-3.5 sm:p-4 space-y-2.5 ${
              isDistress
                ? "border-rose-500/60 bg-rose-500/10"
                : "border-amber-500/50 bg-amber-500/10"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-action-danger">
                    <ShieldAlert className="h-4 w-4" />
                    {isDistress ? "Student Safety Alert" : "Location Complaint"} •{" "}
                    {inc.ticketCode}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-surface px-2 py-0.5 text-[11px] font-medium text-text-primary">
                    <MapPin className="h-3 w-3 text-action-primary" />
                    {inc.postName}
                    {inc.exactSpot ? ` (${inc.exactSpot})` : ""}
                  </span>
                </div>
                <p className="text-sm font-semibold text-text-primary">
                  {inc.summary}
                </p>
                <p className="text-xs text-text-muted">
                  Student:{" "}
                  <strong className="text-text-primary">{inc.studentName}</strong>
                  {inc.studentRoll ? ` (${inc.studentRoll})` : ""}
                  {inc.ackByGuardName
                    ? ` • Responding: ${inc.ackByGuardName}`
                    : ""}
                </p>
              </div>

              <span className="rounded-full border border-border bg-bg-surface px-2.5 py-0.5 font-mono text-[11px] font-semibold text-text-primary">
                {inc.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
              {inc.studentPhone && (
                <a
                  href={`tel:${inc.studentPhone}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  <span>Call Student Now</span>
                </a>
              )}

              {inc.status === "OPEN" && (
                <button
                  type="button"
                  onClick={() => onAcknowledge(inc.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-action-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  <span>Acknowledge &amp; Go There</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onResolve(inc.id)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-elevated"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-action-success" />
                <span>Mark Resolved &amp; Back on Post</span>
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
