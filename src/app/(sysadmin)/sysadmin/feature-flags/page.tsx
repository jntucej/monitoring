"use client";

import { useState } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { FeatureFlagsContent } from "@/components/sysadmin/domains/platform/FeatureFlagsContent";
import { FeatureFlagsDrawer } from "@/components/sysadmin/domains/platform/FeatureFlagsDrawer";
import type {
  FeatureFlagsData,
  FeatureFlagsEntity,
} from "@/components/sysadmin/domains/platform/types";

export default function FeatureFlagsPage() {
  const { data, loading, error, refresh } = useDashboardData<FeatureFlagsData>(
    "/api/admin/platform/feature-flags/overview",
    { ttlMs: 180000, pollMs: 60000 },
  );

  const [selected, setSelected] = useState<FeatureFlagsEntity | null>(null);

  return (
    <WidgetBoundary>
      <PageHeader title="Feature Flags" onRefresh={refresh} />
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
          Failed to load Feature Flags: {String(error)}
        </div>
      ) : data ? (
        <FeatureFlagsContent data={data} onRowClick={setSelected} />
      ) : null}
      <FeatureFlagsDrawer
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
