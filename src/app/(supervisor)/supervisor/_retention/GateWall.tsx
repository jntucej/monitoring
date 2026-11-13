"use client";

import Link from "next/link";
import { DoorOpen, DoorClosed, Users, AlertTriangle } from "lucide-react";

export interface Gate {
  id: string;
  name: string;
  isActive: boolean;
  onPost: number;
  lastActivity: string | null;
}

function fmtLastActivity(iso: string | null): string {
  if (!iso) return "no activity";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function GateWall({ gates }: { gates: Gate[] }) {
  if (gates.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-bg-surface p-4 sm:p-5">
        <header className="mb-2 flex items-center gap-2">
          <DoorOpen className="size-4 text-action-info" />
          <h2 className="text-sm font-semibold text-text-primary">Gates</h2>
        </header>
        <p className="text-xs text-text-muted">
          No gates assigned to you.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-bg-surface p-4 sm:p-5">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DoorOpen className="size-4 text-action-info" />
          <h2 className="text-sm font-semibold text-text-primary">Gates</h2>
        </div>
        <Link
          href="/supervisor/gates/live"
          className="text-[11px] text-action-primary hover:underline"
        >
          Full view →
        </Link>
      </header>

      <ul className="space-y-2">
        {gates.map((g) => {
          const online = g.isActive && g.onPost > 0;
          return (
            <li
              key={g.id}
              className={`flex items-center gap-3 rounded-lg border p-2.5 ${
                online
                  ? "border-action-primary/30 bg-action-primary/5"
                  : "border-action-warning/30 bg-action-warning/5"
              }`}
            >
              {online ? (
                <DoorOpen className="size-4 text-action-primary" />
              ) : (
                <DoorClosed className="size-4 text-action-warning" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {g.name}
                </p>
                <p className="text-[10px] text-text-muted">
                  {fmtLastActivity(g.lastActivity)}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <Users className="size-3 text-text-muted" />
                <span className="font-medium tabular-nums">{g.onPost}</span>
              </div>
              {!online && (
                <AlertTriangle className="size-3.5 text-action-warning" />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
