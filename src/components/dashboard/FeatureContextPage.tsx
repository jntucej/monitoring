"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Layers, ShieldCheck } from "lucide-react";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import {
  TelemetryKpiCard,
  BarcodeRatioCard,
} from "@/components/dashboard/UnifiedDashboardWidgets";
import { getAuthHeaders } from "@/lib/utils";
import type { AreaId, AreaAdapter } from "@/lib/org-map-adapters";

export interface FeatureContextAction {
  label: string;
  href: string;
}

export interface FeatureContextPageProps {
  roleLabel: string;
  purpose: string;
  why?: string;
  contextLabel: string;
  statusSummary: string;
  statusTone?: "info" | "warn" | "critical" | "ok";
  area: AreaId;
  hierarchyHref: string;
  primaryAction: FeatureContextAction;
  secondaryActions?: FeatureContextAction[];
  breakdownTitle?: string;
  children: React.ReactNode;
  inspector?: React.ReactNode;
}

export function FeatureContextPage({
  roleLabel,
  purpose,
  why,
  contextLabel,
  statusSummary,
  statusTone = "info",
  area,
  hierarchyHref,
  primaryAction,
  secondaryActions = [],
  breakdownTitle = "Scope Breakdown & Live Pulse",
  children,
  inspector,
}: FeatureContextPageProps) {
  const [adapter, setAdapter] = useState<AreaAdapter | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/org-map?area=${encodeURIComponent(area)}`, {
      headers: getAuthHeaders(),
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json?.data?.adapter) {
          setAdapter(json.data.adapter as AreaAdapter);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [area]);

  const kpis = adapter?.kpis ?? [];
  const activeNodes = adapter?.nodes.filter((n) => n.status === "online").length ?? 0;
  const totalNodes = adapter?.nodes.length ?? 0;
  const activePct = totalNodes > 0 ? Math.round((activeNodes / totalNodes) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 py-4 sm:py-6 space-y-5 min-w-0">
      {/* Band 1: Context & Scope Strip */}
      <ContextSituationBar
        roleLabel={roleLabel}
        purpose={purpose}
        why={why}
        contextLabel={contextLabel}
        statusTone={statusTone}
        statusSummary={statusSummary}
        primaryAction={primaryAction}
        secondaryActions={[
          ...secondaryActions,
          { label: "Scoped Hierarchy", href: hierarchyHref },
        ]}
      />

      {/* Band 2: KPI & State Pulse Row */}
      {kpis.length > 0 && (
        <WidgetBoundary title="Scope KPIs">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.slice(0, 4).map((kpi) => (
              <TelemetryKpiCard
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                delta={kpi.delta}
                sub={kpi.sub}
                tone={kpi.tone}
              />
            ))}
          </div>
        </WidgetBoundary>
      )}

      {/* Band 3: Primary Feature Workspace + Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className="xl:col-span-8 min-w-0 space-y-4">{children}</div>

        <aside className="xl:col-span-4 space-y-4 min-w-0">
          {totalNodes > 0 && (
            <BarcodeRatioCard
              title={breakdownTitle}
              pct={activePct}
              countLabel={`${activeNodes}/${totalNodes} active`}
              tone="emerald"
            />
          )}

          <div className="rounded-2xl border border-border-subtle bg-bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                <Layers className="h-3.5 w-3.5" />
                <span>Scope &amp; Privacy</span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3 w-3" />
                RBAC Scoped
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Data on this page is filtered to your {roleLabel} scope. Internal UUIDs are redacted for non-sysadmin roles.
            </p>
            <Link
              href={hierarchyHref}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-action-primary hover:underline"
            >
              Open {roleLabel} Hierarchy Map
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Band 4: Contextual Inspector Slot */}
          {inspector}
        </aside>
      </div>
    </div>
  );
}
