"use client";

/* ── PrincipalLoading ── */

import { Crown } from "lucide-react";

export function PrincipalLoading() {
  return (
    <div className="flex min-h100 w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted">
        <Crown className="size-6" />
        <p className="text-sm">Loading principal console…</p>
      </div>
    </div>
  );
}
