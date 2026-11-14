"use client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export interface GlassCardProps {
  id: string;
  title: string;
  subtitle: string;
  status: "entry" | "exit" | "idle" | "warning";
  children?: React.ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
  index?: number;
  onDragEnd?: (id: string, newIndex: number) => void;
}

export function GlassCard({
  title, subtitle, status, children, className, href, onClick,
}: GlassCardProps) {
  const router = useRouter();
  const cls = cn(
    "glass-card block p-[var(--spacing-card)]",
    status === "entry"   && "border-l-4 border-l-[var(--color-action-success)]",
    status === "exit"    && "border-l-4 border-l-[var(--color-action-danger)]",
    status === "warning" && "border-l-4 border-l-[var(--color-action-warning)]",
    className,
  );
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h3>
        {status !== "idle" && (
          <span className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            status === "entry"   && "bg-[var(--color-entry-bg)] text-[var(--color-entry-fg)]",
            status === "exit"    && "bg-[var(--color-exit-bg)] text-[var(--color-exit-fg)]",
            status === "warning" && "bg-[var(--color-dayout-bg)] text-[var(--color-dayout-fg)]",
          )}>{status}</span>
        )}
      </div>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
      {children && <div className="mt-3">{children}</div>}
    </>
  );
  if (href) return <a href={href} onClick={onClick} className={cls}>{body}</a>;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(cls, "text-left w-full")}>
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
}

export default GlassCard;
