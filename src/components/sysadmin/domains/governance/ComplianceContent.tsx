"use client";

import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import type { ComplianceData, ComplianceEntity } from "@/components/sysadmin/domains/governance/types";

interface Props {
  data: ComplianceData;
  onRowClick: (e: ComplianceEntity) => void;
}

export function ComplianceContent({ data, onRowClick }: Props) {
  const items = data?.items ?? [];
  return (
    <WidgetBoundary>
      {items.length === 0 ? (
        <EmptyState
          title="No compliance items"
          description="Operational records and settings for compliance will appear here."
        />
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                onClick={() => onRowClick(item as any)}
              >
                {item.id}
              </button>
            </li>
          ))}
        </ul>
      )}
    </WidgetBoundary>
  );
}
