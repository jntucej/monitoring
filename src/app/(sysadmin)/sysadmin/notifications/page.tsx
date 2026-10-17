"use client";

import { useState } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationsContent } from "@/components/sysadmin/domains/platform/NotificationsContent";
import { NotificationsDrawer } from "@/components/sysadmin/domains/platform/NotificationsDrawer";
import type {
  NotificationsEnvelope,
  NotificationsEntity,
} from "@/components/sysadmin/domains/platform/types";

export default function NotificationsPage() {
  const { data, loading, error, refresh } = useDashboardData<NotificationsEnvelope>(
    "/api/admin/platform/notifications/overview",
    { ttlMs: 180000, pollMs: 60000 },
  );
  const payload = data?.data ?? null;

  const [selected, setSelected] = useState<NotificationsEntity | null>(null);

  return (
    <WidgetBoundary>
      <PageHeader title="Notifications" onRefresh={refresh} />
      {loading && !payload ? (
        <Skeleton className="h-64 w-full" />
      ) : error && !payload ? (
        <div
          role="alert"
          className="rounded-md border p-4 text-sm"
          style={{
            borderColor: "var(--action-danger)",
            background: "color-mix(in srgb, var(--action-danger) 10%, transparent)",
            color: "var(--action-danger)",
          }}
        >
          Failed to load Notifications: {String(error)}
        </div>
      ) : payload ? (
        <NotificationsContent data={payload} onRowClick={setSelected} />
      ) : null}
      <NotificationsDrawer
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
