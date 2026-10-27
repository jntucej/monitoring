"use client";

import { useState } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { WebhooksContent } from "@/components/sysadmin/domains/platform/WebhooksContent";
import { WebhooksDrawer } from "@/components/sysadmin/domains/platform/WebhooksDrawer";
import type {
  WebhooksData,
  WebhooksEntity,
} from "@/components/sysadmin/domains/platform/types";

export default function WebhooksPage() {
  const { data, loading, error, refresh } = useDashboardData<WebhooksData>(
    "/api/admin/platform/webhooks/overview",
    { ttlMs: 180000, pollMs: 60000 },
  );

  const [selected, setSelected] = useState<WebhooksEntity | null>(null);

  return (
    <WidgetBoundary>
      <PageHeader title="Webhooks" onRefresh={refresh} />
      {loading && !data ? (
        <Skeleton className="h-64 w-full" />
      ) : error && !data ? (
        <div
          role="alert"
          className="rounded-md border p-4 text-sm"
          style={{
            borderColor: "var(--action-danger)",
            background: "color-mix(in srgb, var(--action-danger) 10%, transparent)",
            color: "var(--action-danger)",
          }}
        >
          Failed to load Webhooks: {String(error)}
        </div>
      ) : data ? (
        <WebhooksContent data={data} onRowClick={setSelected} />
      ) : null}
      <WebhooksDrawer
        entity={selected}
        onClose={() => setSelected(null)}
        onMutate={() => {
          setSelected(null);
          void refresh();
        }}
      />
    </WidgetBoundary>
  );
}
