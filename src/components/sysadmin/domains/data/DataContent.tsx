"use client";

import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import type { DataData, DataEntity } from "@/components/sysadmin/domains/data/types";

interface Props {
  data: DataData;
  onRowClick: (e: DataEntity) => void;
  tab?: string;
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
                className="w-full text-left px-3 py-2 rounded hover:bg-[var(--bg-elevated)] dark:hover:bg-[var(--bg-elevated)] transition"
                onClick={() => onRowClick(item as unknown as DataEntity)}
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
