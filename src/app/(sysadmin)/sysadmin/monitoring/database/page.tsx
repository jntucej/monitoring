"use client";
import { Database } from "lucide-react";
import Link from "next/link";
import { MonitoringSubPage } from "../_frame";

export default function MonitoringDatabasePage() {
  return (
    <MonitoringSubPage
      title="Database & Cache"
      subtitle="PostgreSQL and Redis health, connections, and latency."
      contextLabel="Database"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/sysadmin/database-health"
          className="rounded-xl border border-border bg-bg-surface p-5 hover:border-action-primary transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <Database className="size-4 text-action-success" />
            <span className="text-sm font-bold">PostgreSQL</span>
          </div>
          <p className="text-xs text-text-muted">Latency, active connections, database size, cache hit ratio, longest query.</p>
          <span className="text-xs text-action-primary font-medium mt-2 inline-block">Open database health →</span>
        </Link>
        <div className="rounded-xl border border-border bg-bg-surface p-5">
          <div className="flex items-center gap-2 mb-2">
            <Database className="size-4 text-action-primary" />
            <span className="text-sm font-bold">Redis</span>
          </div>
          <p className="text-xs text-text-muted">
            Redis connection status and latency are reported on the Docker Services dashboard.
          </p>
          <Link href="/sysadmin/docker-services" className="text-xs text-action-primary font-medium mt-2 inline-block">
            Open service dashboard →
          </Link>
        </div>
      </div>
    </MonitoringSubPage>
  );
}
