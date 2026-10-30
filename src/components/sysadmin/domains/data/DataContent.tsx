"use client";

import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import type { DataData, DataEntity } from "@/components/sysadmin/domains/data/types";

interface Props {
  data: DataData;
  onRowClick: (e: DataEntity) => void;
}

export function DataContent({ data, onRowClick }: Props) {
  const items = data?.items ?? [];
  return (
    <WidgetBoundary>
      {items.length === 0 ? (
        <EmptyState
          title="No data items"
          description="Operational records and settings for data will appear here."
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
