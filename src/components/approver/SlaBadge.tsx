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

interface SlaBadgeProps {
  slaDeadline: string | null | undefined;
  status?: string;
  className?: string;
}

export function SlaBadge({ slaDeadline, status, className = "" }: SlaBadgeProps) {
  const slsStatus = getSlaStatus(slaDeadline, status);
  if (slsStatus === "none") return null;

  const config: Record<Exclude<SlaStatus, "none">, { label: string; cls: string }> = {
    overdue: { label: "SLA breached", cls: "bg-rose-500/10 text-rose-500 border-rose-500/30" },
    "due-soon": { label: "Due soon", cls: "bg-amber-500/10 text-amber-500 border-amber-500/30" },
    ok: { label: "On track", cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" },
  };

  const { label, cls } = config[slsStatus];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls} ${className}`}
      title={slaDeadline ? `SLA: ${formatDateTime(slaDeadline)}` : undefined}
    >
      {label}
      {slaDeadline && <span className="font-mono text-[10px] opacity-70">{formatDateTime(slaDeadline)}</span>}
    </span>
  );
}

export default SlaBadge;
