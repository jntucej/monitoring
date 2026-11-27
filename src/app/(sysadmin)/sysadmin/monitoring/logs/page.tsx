"use client";
import { ScrollText } from "lucide-react";
import { MonitoringSubPage } from "../_frame";
import { ObservabilityStackPanel } from "@/components/sysadmin/monitoring/ObservabilityStackPanel";

export default function MonitoringLogsPage() {
  return (
    <MonitoringSubPage
      title="Logs"
      subtitle="Application and infrastructure logs via Loki, with container and search filters."
      contextLabel="Logs"
    >
      <ObservabilityStackPanel />
      <p className="text-xs text-text-muted flex items-center gap-1.5">
        <ScrollText className="size-3.5" />
        Logs are fetched from the Loki instance (mon_loki). If Loki is unreachable the panel shows an explicit unavailable state.
      </p>
    </MonitoringSubPage>
  );
}
