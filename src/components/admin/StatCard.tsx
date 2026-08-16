import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  trend?: string;
}

export function StatCard({ label, value, icon: Icon, color, trend }: StatCardProps) {
  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center`}
          style={{ backgroundColor: `${color}20`, color }}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[var(--text-muted)]">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {trend ? (
            <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{trend}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
