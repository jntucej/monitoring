"use client";
// src/app/(sysadmin)/sysadmin/people/page.tsx
// PEOPLE sysadmin page (faceted-table + drawer, pollMs 60000).
// The layout enforces withAuthorization + withRateLimit; this client page pulls
// the aggregated payload and renders the faceted table + KPIs + cohort matrix,
// opening the PeopleDrawer on row click (no route change).

<<<<<<< HEAD
export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { Users, GraduationCap, Briefcase, Building2, Upload, ArrowUpRight, UserCheck } from "lucide-react";
import { CsvBulkImporter } from "@/components/sysadmin/CsvBulkImporter";
=======
import { useState, useCallback } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { PeopleContent } from "@/components/sysadmin/domains/identity/PeopleContent";
import { PeopleDrawer } from "@/components/sysadmin/domains/identity/PeopleDrawer";
import type {
  PersonRow,
  PeopleData,
} from "@/components/sysadmin/domains/identity/types";
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31

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

  return (
<<<<<<< HEAD
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">People & Identity Hub</p>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Unified management of students, faculty, staff, wardens, and bulk CSV ingestion.
        </p>
      </div>

      {/* Navigation Quick Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/sysadmin/students"
          className="p-4 rounded-xl bg-[var(--surface-default)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <GraduationCap className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition" />
          </div>
          <h3 className="font-semibold text-sm text-[var(--text-primary)] mt-3">Students Directory</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Manage enrollment, hostels, guardians</p>
        </Link>

        <Link
          href="/sysadmin/staff"
          className="p-4 rounded-xl bg-[var(--surface-default)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
              <Briefcase className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition" />
          </div>
          <h3 className="font-semibold text-sm text-[var(--text-primary)] mt-3">Staff & Faculty</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Faculty, workers, gate operators</p>
        </Link>

        <Link
          href="/sysadmin/departments"
          className="p-4 rounded-xl bg-[var(--surface-default)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Building2 className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition" />
          </div>
          <h3 className="font-semibold text-sm text-[var(--text-primary)] mt-3">Departments & HODs</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Department mappings and heads</p>
        </Link>

        <Link
          href="/sysadmin/roles"
          className="p-4 rounded-xl bg-[var(--surface-default)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <UserCheck className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition" />
          </div>
          <h3 className="font-semibold text-sm text-[var(--text-primary)] mt-3">Role Matrix</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Permissions & privilege assignments</p>
        </Link>
      </div>

      {/* Primary Tool: 2-Phase CSV Bulk Ingestion */}
      <div className="bg-[var(--surface-default)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm">
        <CsvBulkImporter />
      </div>
    </div>
=======
    <WidgetBoundary>
      <PageHeader title="People" subtitle="Identity directory" onRefresh={refresh} />
      {loading && !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <PeopleContent data={data} loading={loading} error={error} onRowClick={openRow} />
          <PeopleDrawer row={selectedRow} onClose={() => setSelectedRow(null)} />
        </>
      )}
    </WidgetBoundary>
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
  );
}
