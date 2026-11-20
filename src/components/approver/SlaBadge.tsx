import { formatDateTime } from "@/lib/utils";

export type SlaStatus = "overdue" | "due-soon" | "ok" | "none";

export function getSlaStatus(slaDeadline: string | null | undefined, status?: string): SlaStatus {
  if (!slaDeadline) return "none";
  if (status === "APPROVED" || status === "REJECTED") return "none";
  const now = Date.now();
  const deadline = new Date(slaDeadline).getTime();
  if (deadline < now) return "overdue";
  if (deadline - now < 2 * 60 * 60 * 1000) return "due-soon";
  return "ok";
}

/** Human-readable "time left" / "overdue by" relative to now. */
export function getSlaRemaining(slaDeadline: string, now = Date.now()): string {
  const deadline = new Date(slaDeadline).getTime();
  const diff = deadline - now; // positive = still has time
  const abs = Math.abs(diff);
  const totalMin = Math.floor(abs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return diff < 0 ? `${label} overdue` : `${label} left`;
}

interface SlaBadgeProps {
  slaDeadline: string | null | undefined;
  status?: string;
  className?: string;
  /** Show a relative "time left / overdue by" label. Default true. */
  showRemaining?: boolean;
}

export function SlaBadge({ slaDeadline, status, className = "", showRemaining = true }: SlaBadgeProps) {
  const slsStatus = getSlaStatus(slaDeadline, status);
  if (slsStatus === "none") return null;

  const config: Record<Exclude<SlaStatus, "none">, { label: string; cls: string }> = {
    overdue: { label: "SLA breached", cls: "bg-rose-500/10 text-rose-500 border-rose-500/30" },
    "due-soon": { label: "Due soon", cls: "bg-amber-500/10 text-amber-500 border-amber-500/30" },
    ok: { label: "On track", cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" },
  };

  const { label, cls } = config[slsStatus];
  const remaining = showRemaining && slaDeadline ? getSlaRemaining(slaDeadline) : undefined;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${cls} ${className}`}
      title={slaDeadline ? `SLA: ${formatDateTime(slaDeadline)}` : undefined}
    >
      {label}
      {remaining && <span className="font-mono text-xs font-normal opacity-80">{remaining}</span>}
    </span>
  );
}

export default SlaBadge;
