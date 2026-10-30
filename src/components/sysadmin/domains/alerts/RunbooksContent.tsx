"use client";

import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import type { RunbooksData, RunbooksEntity } from "@/components/sysadmin/domains/alerts/types";

interface Props {
  data: RunbooksData;
  onRowClick: (e: RunbooksEntity) => void;
}

export function RunbooksContent({ data, onRowClick }: Props) {
  const items = data?.items ?? [];
  return (
    <WidgetBoundary>
      {items.length === 0 ? (
        <EmptyState
          title="No runbooks items"
          description="Operational records and settings for runbooks will appear here."
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
