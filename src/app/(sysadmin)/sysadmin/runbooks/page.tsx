"use client";

import { useState } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { RunbooksContent } from "@/components/sysadmin/domains/alerts/RunbooksContent";
import { RunbooksDrawer } from "@/components/sysadmin/domains/alerts/RunbooksDrawer";
import type {
  RunbooksData,
  RunbooksEntity,
} from "@/components/sysadmin/domains/alerts/types";

export default function RunbooksPage() {
  const { data, loading, error, refresh } = useDashboardData<RunbooksData>(
    "/api/admin/alerts/runbooks/overview",
    { ttlMs: 360000, pollMs: 120000 },
  );

  const [selected, setSelected] = useState<RunbooksEntity | null>(null);

  return (
    <WidgetBoundary>
      <PageHeader title="Runbooks" onRefresh={refresh} />
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
          Failed to load Runbooks: {String(error)}
        </div>
      ) : data ? (
        <RunbooksContent data={data} onRowClick={setSelected} />
      ) : null}
      <RunbooksDrawer
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
