"use client";

import { Check, X, AlertTriangle } from "lucide-react";
import { SpecialItemBadge } from "./SpecialItemBadge";

export interface ScanResultData {
  outcome: string;
  reason?: string;
  student_name?: string;
  roll_no?: string;
  meal_type?: string;
  special_subline?: string | null;
}

export function ResultScreen({
  tone,
  data,
}: {
  tone: "green" | "red" | "amber";
  data: ScanResultData | null;
}) {
  const bg =
    tone === "green"
      ? "bg-emerald-600"
      : tone === "amber"
        ? "bg-amber-600"
        : "bg-destructive";

  return (
    <div
      className={`flex flex-1 flex-col items-center justify-center px-6 text-center text-white ${bg}`}
      role="status"
      aria-live="assertive"
    >
      <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-white/20">
        {tone === "green" && <Check className="h-16 w-16 stroke-[3]" />}
        {tone === "red" && <X className="h-16 w-16 stroke-[3]" />}
        {tone === "amber" && <AlertTriangle className="h-16 w-16 stroke-[2.5]" />}
      </div>

      {tone === "green" && (
        <>
          <div className="text-5xl font-bold tracking-tight sm:text-7xl">
            {data?.student_name ?? "Student"}
          </div>
          {data?.roll_no && (
            <div className="mt-2 font-mono text-2xl text-white/90">{data.roll_no}</div>
          )}
          <div className="mt-4 text-2xl font-medium capitalize text-white/95">
            {data?.meal_type ?? "Meal"} — Welcome
          </div>
          <SpecialItemBadge subline={data?.special_subline} />
        </>
      )}

      {tone === "amber" && (
        <>
          <div className="text-4xl font-bold">Duplicate Scan</div>
          <div className="mt-3 max-w-md text-xl text-white/95">
            {data?.reason ?? "Already scanned — verify with mess incharge"}
          </div>
        </>
      )}

      {tone === "red" && (
        <>
          <div className="text-4xl font-bold">Rejected</div>
          <div className="mt-3 max-w-md text-xl text-white/95">
            {data?.reason ?? data?.outcome ?? "Invalid token"}
          </div>
        </>
      )}
    </div>
  );
}
