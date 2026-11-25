"use client";
import Link from "next/link";
import { Wrench, AlertTriangle, ArrowRight } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { PageHeader } from "@/components/shared/PageHeader";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { LivePulseStrip } from "@/components/shared/LivePulseStrip";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { ComplaintConsole } from "@/components/complaints/ComplaintConsole";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import { RoleAnalytics } from "@/components/retention/RoleAnalytics";

interface ComplaintRow { id?: string; status?: string; [k: string]: unknown; }
type ComplaintsData = ComplaintRow[] | { data?: { complaints?: ComplaintRow[] } };

function KpiTile({
  label,
  value,
  tone = "ok",
  linkHref,
}: {
  label: string;
  value: string | number;
  tone?: "ok" | "warn" | "bad";
  /** (UX-006) Drill-down target to the underlying records. */
  linkHref?: string;
}) {
  const toneClass =
    tone === "bad"
      ? "text-red-400"
      : tone === "warn"
        ? "text-action-warning"
        : "text-text-primary";
  const tile = (
    <div className="surface-card bg-[var(--bg-elev-1)] p-4 min-w-0">
      <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
  if (linkHref) {
    return (
      <a
        href={linkHref}
        aria-label={`${label}: ${value}. View records`}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary transition-colors hover:bg-[var(--bg-elev-2)]"
      >
        {tile}
      </a>
    );
  }
  return tile;
}

export default function EmoLandingPage() {
  const { data } = useApiResource<ComplaintsData>("/api/complaints", { ttlMs: 60_000 });
  const rows = Array.isArray(data) ? data : Array.isArray((data as { data?: { complaints?: ComplaintRow[] } })?.data?.complaints)
    ? (data as { data?: { complaints?: ComplaintRow[] } }).data!.complaints!
    : [];
  const openBacklog = rows.filter((r) => !["resolved", "closed"].includes(String(r.status ?? "").toLowerCase())).length;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Electrical Maintenance Officer (EMO)</h1>
        <p className="text-xs sm:text-sm text-text-muted mt-0.5">
          Manage campus electrical and lab-power maintenance complaints.
        </p>
      </div>

      <ContextSituationBar
        roleLabel="Electrical Maintenance Officer"
        purpose="Triage campus electrical breakdowns, assign electrician work orders, and restore lab power"
        why="Campus electrical disruptions directly impact academic labs, classrooms, and residential safety."
        contextLabel="Electrical Maintenance Queue"
        statusTone={openBacklog > 0 ? "warn" : "ok"}
        statusPill={openBacklog > 0 ? `${openBacklog} open` : "All clear"}
        summary={
          openBacklog > 0
            ? `${openBacklog} electrical or lab-power complaint${openBacklog === 1 ? "" : "s"} need attention.`
            : "No open electrical maintenance complaints right now."
        }
        primaryAction={{ label: "Open Complaint Queue", href: "/emo/complaints", badgeCount: openBacklog }}
        secondaryAction={{ label: "Resolved Tickets", href: "/emo/complaints?status=resolved" }}
      />
      <LivePulseStrip items={[{ id: "emo", label: "Electrical Ops", valueLabel: "Live", tone: "warn", benchmark: "Triage campus power & lab complaints" }, { id: "sla", label: "Resolution", valueLabel: "Active", tone: "info", benchmark: "Update status & close resolved tickets" }]} />

      <WidgetBoundary name="EmoKpis" title="EMO KPIs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <KpiTile label="Assigned complaints" value={rows.length} linkHref="/emo/complaints" />
          <KpiTile label="Open backlog" value={openBacklog} tone={openBacklog > 0 ? "warn" : "ok"} linkHref="/emo/complaints" />
        </div>
      </WidgetBoundary>

      <Link
        href="/emo/complaints"
        className="surface-card group flex items-center justify-between p-4 hover:bg-[var(--bg-elev-1)] min-h-11"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-action-warning" />
          <div>
            <div className="font-semibold">Complaint Queue</div>
            <div className="text-xs text-text-muted">
              Power outages, UPS failures, lab wiring hazards
            </div>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-action-primary" />
      </Link>
      <Link
        href="/emo/complaints?status=resolved"
        className="surface-card group flex items-center justify-between p-4 hover:bg-[var(--bg-elev-1)] min-h-11"
      >
        <div className="flex items-center gap-3">
          <Wrench className="w-5 h-5 text-action-success" />
          <div>
            <div className="font-semibold">Resolved</div>
            <div className="text-xs text-text-muted">
              Closed maintenance tickets
            </div>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-action-primary" />
      </Link>

      <WidgetBoundary name="ComplaintConsole" title="Complaint Console">
        <ComplaintConsole role="emo" basePath="/emo/complaints" />
      </WidgetBoundary>

      <details className="surface-card bg-bg-surface p-4">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-text-secondary">
          More workspace tools &amp; calendar
        </summary>
        <div className="mt-4 space-y-4">
          <WidgetBoundary name="TaskContinuity" title="Task Continuity"><TaskContinuity /></WidgetBoundary>
          <WidgetBoundary name="UnifiedCampusCalendar" title="Unified Campus Calendar"><UnifiedCampusCalendar /></WidgetBoundary>
          <WidgetBoundary name="RoleAnalytics" title="Role Analytics"><RoleAnalytics /></WidgetBoundary>
          <WidgetBoundary name="QuickActions" title="Quick Actions"><QuickActions /></WidgetBoundary>
          <WidgetBoundary name="NotificationCenter" title="Notification Center"><NotificationCenter /></WidgetBoundary>
        </div>
      </details>

    </div>
  );
}
