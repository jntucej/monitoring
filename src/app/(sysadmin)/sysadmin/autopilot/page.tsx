"use client";

/**
 * /sysadmin/autopilot — AUTOPILOT control-plane console.
 *
 * The AUTOPILOT agent system is a separate Rust/Axum service (missions,
 * deterministic lifecycle state machine, transactional event outbox)
 * running on 127.0.0.1:8401 with its own dedicated PostgreSQL database
 * (autopilot_runtime). This page is the sysadmin surface: create missions,
 * drive lifecycle transitions, inspect the durable event history, and
 * watch the outbox backlog.
 *
 * Every action is a server call (closed-loop); no state is mutated locally.
 */
import { AutopilotMissionsClient } from "@/components/sysadmin/AutopilotMissionsClient";
import { PageHeader } from "@/components/admin/shared/PageHeader";

export default function AutopilotPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AUTOPILOT Agent Console"
        subtitle="Missions, lifecycle transitions, durable event history, and outbox backlog for the AUTOPILOT control plane."
      />
      <AutopilotMissionsClient />
    </div>
  );
}
