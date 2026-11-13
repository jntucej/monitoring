"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export interface HotSpot {
  department: string;
  absent: number;
  total: number;
  rate: number;
}

export function HotSpots({ spots }: { spots: HotSpot[] }) {
  if (spots.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-bg-surface p-4 sm:p-5">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-action-warning" />
          <h2 className="text-sm font-semibold text-text-primary">Hot spots</h2>
        </div>
        <Link
          href="/vice-principal/academics/exceptions"
          className="text-[11px] text-action-primary hover:underline"
        >
          See details
        </Link>
      </header>

      <ul className="space-y-2">
        {spots.map((s) => {
          const severity =
            s.rate >= 30
              ? "text-action-danger"
              : s.rate >= 15
              ? "text-action-warning"
              : "text-text-secondary";
          return (
            <li key={s.department} className="flex items-center justify-between text-xs">
              <span className="font-medium text-text-primary">{s.department}</span>
              <span className={`tabular-nums ${severity}`}>
                {s.rate}% absent ({s.absent}/{s.total})
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
