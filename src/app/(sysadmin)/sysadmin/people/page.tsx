"use client";
// src/app/(sysadmin)/sysadmin/people/page.tsx
// PEOPLE sysadmin page (faceted-table + drawer, pollMs 60000).
// The layout enforces withAuthorization + withRateLimit; this client page pulls
// the aggregated payload and renders the faceted table + KPIs + cohort matrix,
// opening the PeopleDrawer on row click (no route change).

import { useState, useCallback } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { PeopleContent } from "@/components/sysadmin/domains/identity/PeopleContent";
import { PeopleDrawer } from "@/components/sysadmin/domains/identity/PeopleDrawer";
import type {
  PersonRow,
  PeopleEnvelope,
} from "@/components/sysadmin/domains/identity/types";

export default function PeoplePage() {
  const { data, loading, error, refresh } = useDashboardData<PeopleEnvelope>(
    "/api/admin/people/overview",
    { ttlMs: 180_000, pollMs: 60_000 },
  );
  // ok() wraps the payload in { data: PeopleData } — unwrap for the content.
  const payload = data?.data ?? null;

  // Drawer state: the clicked row (or null when closed). No route change.
  const [selectedRow, setSelectedRow] = useState<PersonRow | null>(null);

  const openRow = useCallback(
    (id: string) => {
      const row = payload?.rows?.find((r) => r.id === id) ?? null;
      setSelectedRow(row);
    },
    [payload],
  );

  return (
    <WidgetBoundary>
      <PageHeader title="People" subtitle="Identity directory" onRefresh={refresh} />
      {loading && !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <PeopleContent data={payload} loading={loading} error={error} onRowClick={openRow} />
          <PeopleDrawer row={selectedRow} onClose={() => setSelectedRow(null)} />
        </>
      )}
    </WidgetBoundary>
  );
}
