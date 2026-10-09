"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, GraduationCap, Briefcase, Building2, Upload, ArrowUpRight, UserCheck } from "lucide-react";
import { CsvBulkImporter } from "@/components/sysadmin/CsvBulkImporter";

export default function PeopleHubPage() {
  const [activeTab, setActiveTab] = useState<"import" | "directory">("import");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">People & Identity Hub</h1>
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
  );
}
