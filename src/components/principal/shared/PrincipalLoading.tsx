"use client";

/* ── PrincipalLoading ── */

import { Crown } from "lucide-react";

export function PrincipalLoading() {
  return (
    <div className="flex min-h-[400px] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-[var(--text-muted)]">
        <Crown className="h-8 w-8" />
        <p className="text-sm">Loading principal console…</p>
      </div>
    </div>
  );
}
