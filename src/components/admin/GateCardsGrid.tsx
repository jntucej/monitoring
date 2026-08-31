import { Cpu, ChevronRight, Clock, ArrowDownLeft } from "lucide-react";
import Link from "next/link";
import type { Gate } from "@/lib/types";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface GateCardProps {
  gate: Gate & { currentScanCount: number; lastScan: { timestamp: string } | null };
}

export function GateCard({ gate }: GateCardProps) {
  return (
    <Link
      href={`/admin/gates/${gate.id}`}
      className="p-4 border-b sm:border-b-0 sm:border-r border-[var(--border)] last:border-r-0 hover:bg-[var(--bg-elevated)]/30 cursor-pointer transition group"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors">{gate.name}</span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${gate.isActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${gate.isActive ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
          {gate.isActive ? "Online" : "Offline"}
        </span>
      </div>
      <p className="text-[11px] text-[var(--text-muted)] mb-2">{gate.location}</p>
      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1 text-emerald-400"><ArrowDownLeft className="w-3 h-3" /> {gate.currentScanCount}</span>
        {gate.lastScan && (
          <span className="text-[var(--text-muted)] font-mono flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(gate.lastScan.timestamp)}</span>
        )}
      </div>
    </Link>
  );
}

interface GateCardsGridProps {
  locations: (Gate & { currentScanCount: number; lastScan: { timestamp: string } | null })[];
}

export function GateCardsGrid({ locations }: GateCardsGridProps) {
  if (locations.length === 0) return null;
  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-sm hidden sm:inline">🔑 Gates at a Glance</span>
          <span className="text-lg sm:hidden">🔑</span>
        </div>
        <Link href="/admin/gates" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors hidden sm:flex">
          Manage Gates <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {locations.map((gate) => (
          <GateCard key={gate.id} gate={gate} />
        ))}
      </div>
    </div>
  );
}
