"use client";

import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { getTierForRole } from "@/lib/record-capabilities";

export type RoleTier = ReturnType<typeof getTierForRole>;

export type ExportResource =
  | "own-history"
  | "shift-scans"
  | "meal-counts"
  | "dept-attendance"
  | "hostel-movement"
  | "exam-clearances"
  | "approvals-ledger"
  | "institutional-analytics"
  | "audit-logs";

const EXPORT_ACCESS: Record<ExportResource, string[]> = {
  "own-history": ["student", "guardian"],
  "shift-scans": ["operator", "supervisor", "admin", "sysadmin"],
  "meal-counts": ["mess_incharge", "admin", "sysadmin"],
  "dept-attendance": ["faculty", "hod", "vice_principal", "principal", "admin", "sysadmin"],
  "hostel-movement": [
    "deputy_warden",
    "hostel_manager",
    "vice_principal",
    "principal",
    "supervisor",
    "admin",
    "sysadmin",
  ],
  "exam-clearances": [
    "exam_branch",
    "oie",
    "exam_superintendent",
    "vice_principal",
    "principal",
    "admin",
    "sysadmin",
  ],
  "approvals-ledger": [
    "hod",
    "deputy_warden",
    "hostel_manager",
    "exam_branch",
    "oie",
    "vice_principal",
    "principal",
    "supervisor",
    "admin",
    "sysadmin",
  ],
  "institutional-analytics": ["vice_principal", "principal", "supervisor", "admin", "sysadmin"],
  "audit-logs": ["principal", "admin", "sysadmin"],
};

const TIER_ORDER: Record<RoleTier, number> = {
  "tier-0": 0,
  "tier-1": 1,
  "tier-2": 2,
  "tier-3": 3,
  "tier-4": 4,
};

export function canRoleExport(role: string | null | undefined, resource: ExportResource): boolean {
  if (!role) return false;
  return (EXPORT_ACCESS[resource] ?? []).includes(role.toLowerCase());
}

export interface ExportColumn<T> {
  key: keyof T | string;
  header: string;
  minTier?: RoleTier;
  accessor?: (row: T) => string | number | boolean | null | undefined;
}

export function RoleExportButton<T extends object>({
  resource,
  filenamePrefix,
  rows,
  columns,
  serverExportUrl,
}: {
  resource: ExportResource;
  filenamePrefix: string;
  rows: T[];
  columns: ExportColumn<T>[];
  serverExportUrl?: string;
}) {
  const role = useAuthStore((s) => s.user?.role)?.toLowerCase();
  const [exporting, setExporting] = useState(false);

  if (!canRoleExport(role, resource)) {
    return null;
  }

  const viewerTier = getTierForRole(role);
  const allowedColumns = columns.filter((col) => {
    if (!col.minTier) return true;
    return TIER_ORDER[viewerTier] >= TIER_ORDER[col.minTier];
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      if (serverExportUrl) {
        window.open(serverExportUrl, "_blank", "noopener,noreferrer");
        return;
      }

      const headerLine = allowedColumns
        .map((c) => `"${String(c.header).replace(/"/g, '""')}"`)
        .join(",");
      const dataLines = rows.map((row) =>
        allowedColumns
          .map((col) => {
            const raw = col.accessor
              ? col.accessor(row)
              : (row as Record<string, unknown>)[String(col.key)];
            const str = raw === null || raw === undefined ? "" : String(raw);
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(","),
      );

      const csv = [headerLine, ...dataLines].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      type="button"
      data-testid={`export-${resource}`}
      disabled={exporting || (!serverExportUrl && rows.length === 0)}
      onClick={handleExport}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-elevated transition-colors disabled:opacity-50"
    >
      {exporting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      <span>Export CSV{!serverExportUrl ? ` (${rows.length})` : ""}</span>
    </button>
  );
}
