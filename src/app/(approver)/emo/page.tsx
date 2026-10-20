import Link from "next/link";
import { Wrench, AlertTriangle, ArrowRight } from "lucide-react";

export default function EmoLandingPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Electrical Maintenance Officer</h1>
      <p className="text-sm text-[var(--text-muted)]">
        Campus electrical and lab-power grievances (category D1).
      </p>
      <Link
        href="/emo/complaints"
        className="flex items-center justify-between rounded-xl border border-[var(--border)] p-4 hover:bg-[var(--bg-elev-1)]"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <div>
            <div className="font-semibold">Complaint Queue</div>
            <div className="text-xs text-[var(--text-muted)]">
              Power outages, UPS failures, lab wiring hazards
            </div>
          </div>
        </div>
        <ArrowRight className="w-4 h-4" />
      </Link>
      <Link
        href="/emo/complaints?status=resolved"
        className="flex items-center justify-between rounded-xl border border-[var(--border)] p-4 hover:bg-[var(--bg-elev-1)]"
      >
        <div className="flex items-center gap-3">
          <Wrench className="w-5 h-5 text-emerald-400" />
          <div>
            <div className="font-semibold">Resolved</div>
            <div className="text-xs text-[var(--text-muted)]">Closed maintenance tickets</div>
          </div>
        </div>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
