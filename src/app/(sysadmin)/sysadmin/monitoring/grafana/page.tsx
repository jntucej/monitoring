"use client";
import { BarChart3 } from "lucide-react";
import { MonitoringSubPage } from "../_frame";
import { GrafanaEmbed } from "@/components/sysadmin/monitoring/GrafanaEmbed";

export default function MonitoringGrafanaPage() {
  return (
    <MonitoringSubPage
      title="Observability · Grafana"
      subtitle="Embedded, read-only Grafana dashboards via the authenticated server proxy."
      contextLabel="Grafana"
    >
      <GrafanaEmbed />
      <p className="text-xs text-text-muted flex items-center gap-1.5">
        <BarChart3 className="size-3.5" />
        Admin credentials are never sent to the browser — dashboards stream through /api/sysadmin/grafana/embed with a read-only viewer account.
      </p>
    </MonitoringSubPage>
  );
}
