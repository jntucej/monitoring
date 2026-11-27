"use client";
import { DualThroughputCurve } from "@/components/sysadmin/kit/viz";
import { MonitoringSubPage } from "../_frame";

export default function MonitoringMetricsPage() {
  return (
    <MonitoringSubPage
      title="Prometheus Metrics"
      subtitle="API throughput, latency, and scrape-target health from Prometheus."
      contextLabel="Metrics"
    >
      <div className="space-y-4">
        <DualThroughputCurve />
        <p className="text-xs text-text-muted">
          Metrics are served by the <code className="font-mono bg-bg-elevated px-1 rounded">/api/admin/monitoring</code> named-query
          proxy against Prometheus. Add new named queries in <code className="font-mono bg-bg-elevated px-1 rounded">src/lib/monitoring/registry.ts</code>{" "}
          to extend this view.
        </p>
      </div>
    </MonitoringSubPage>
  );
}
