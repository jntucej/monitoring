"use client";
import { Container } from "lucide-react";
import Link from "next/link";
import { MonitoringSubPage } from "../_frame";
import { DockerFleetPanel } from "@/components/sysadmin/monitoring/DockerFleetPanel";

export default function MonitoringContainersPage() {
  return (
    <MonitoringSubPage
      title="Containers"
      subtitle="Docker fleet status, per-container CPU / memory / restarts."
      contextLabel="Containers"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <DockerFleetPanel />
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span className="flex items-center gap-1.5"><Container className="size-3.5" /> 17 containers tracked (gate_* + mon_*)</span>
        <Link href="/sysadmin/docker-services" className="hover:text-action-primary">
          Detailed service management →
        </Link>
      </div>
    </MonitoringSubPage>
  );
}
