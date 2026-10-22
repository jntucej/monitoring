"use client";

import { Info } from "lucide-react";

export function HostelOnlyNotice({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300 ${className}`}>
      <Info className="mr-1 inline h-4 w-4" />
      Mess tokens are available only for hostel students. You can still review meals from the Meal Reviews tab.
    </div>
  );
}
