"use client";

import { Suspense } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { Inbox } from "lucide-react";
import Link from "next/link";

function MessInventoryStockShell() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <Link
        href="/mess"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        Back to Mess Overview
      </Link>

      <WidgetBoundary title="Inventory and Stock">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <Inbox className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">Inventory and Stock</span>
          </div>
          <div className="p-6 text-center">
            <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500 max-w-md mx-auto min-w-0">
              This section was consolidated into the primary Inventory &amp; Stock tab. See the
              stock view under the main nav.
            </p>
            <Link
              href="/mess/inventory"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20"
            >
              Open Inventory and Stock
            </Link>
          </div>
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function MessInventoryStockPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <MessInventoryStockShell />
    </Suspense>
  );
}
