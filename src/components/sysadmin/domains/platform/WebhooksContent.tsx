"use client";

import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import type { WebhooksData, WebhooksEntity } from "@/components/sysadmin/domains/platform/types";

interface Props {
  data: WebhooksData;
  onRowClick: (e: WebhooksEntity) => void;
}

export function WebhooksContent({ data, onRowClick }: Props) {
  const items = data?.items ?? [];
  return (
    <WidgetBoundary>
      {items.length === 0 ? (
        <EmptyState
          title="No webhooks items"
          description="Operational records and settings for webhooks will appear here."
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
