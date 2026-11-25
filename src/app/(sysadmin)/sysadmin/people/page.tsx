"use client";
// src/app/(sysadmin)/sysadmin/people/page.tsx
// PEOPLE sysadmin page (faceted-table + drawer, pollMs 60000).
// The layout enforces withAuthorization + withRateLimit; this client page pulls
// the aggregated payload and renders the faceted table + KPIs + cohort matrix,
// opening the PeopleDrawer on row click (no route change). L4 trace drawer
// surfaces in parallel — record-trace diagnostics + canonical sysadmin routes
// (sessions / audit / runbooks).

import { useState, useCallback } from "react";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { useDashboardData } from "@/hooks/useDashboardData";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { PeopleContent } from "@/components/sysadmin/domains/identity/PeopleContent";
import { PeopleDrawer } from "@/components/sysadmin/domains/identity/PeopleDrawer";
import {
  SysAdminTraceDrawer,
  type SysAdminTraceTarget,
} from "@/components/nav/level4/SysAdminTraceDrawer";
import type {
  PersonRow,
  PeopleData,
} from "@/components/sysadmin/domains/identity/types";

function buildUserTrace(row: PersonRow): SysAdminTraceTarget {
  return {
    entityType: "user",
    identifier: row.id,
    label: row.name,
    diagnostics: [
      { label: "role", value: row.role },
      { label: "state", value: row.state },
      { label: "email", value: row.email },
      {
        label: "2FA",
        value: row.two_factor_enabled ? "enabled" : "disabled",
      },
      {
        label: "sessions",
        value: String(row.sessions_count),
      },
      {
        label: "last login",
        value: row.last_login_at
          ? new Date(row.last_login_at).toLocaleString("en-IN")
          : "never",
      },
    ],
    traceRoutes: [
      { label: "sessions", href: "/sysadmin/sessions" },
      { label: "audit", href: "/sysadmin/audit" },
      { label: "runbooks", href: "/sysadmin/runbooks" },
    ],
  };
}

export default function PeoplePage() {
  const { data, loading, error, refresh } = useDashboardData<PeopleData>(
    "/api/admin/people/overview",
    { ttlMs: 180_000, pollMs: 60_000 },
  );

  // Drawer state: the clicked row (or null when closed). No route change.
  const [selectedRow, setSelectedRow] = useState<PersonRow | null>(null);

  const openRow = useCallback(
    (id: string) => {
      const row = data?.rows?.find((r) => r.id === id) ?? null;
      setSelectedRow(row);
    },
    [data],
  );

  const trace: SysAdminTraceTarget | null = selectedRow
    ? buildUserTrace(selectedRow)
    : null;

  return (
    <WidgetBoundary>
      <PageHeader title="People" subtitle="Identity directory" onRefresh={refresh} />
      {loading && !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
                <ContextSituationBar
        roleLabel="System Admin"
        purpose="System-level view of every person record across the campus: students, faculty, staff, and guardians."
        contextLabel="Sysadmin People"
        why="Use this view to cross-reference identity data before a bulk import or migration."
        statusSummary="Review the current state and take action below."
      />
<div className="section-offscreen">
            <PeopleContent data={data} loading={loading} error={error} onRowClick={openRow} />
          </div>
          <PeopleDrawer row={selectedRow} onClose={() => setSelectedRow(null)} />
          <SysAdminTraceDrawer
            trace={trace}
            onClose={() => setSelectedRow(null)}
          />
        </>
      )}
    </WidgetBoundary>
  );
}
