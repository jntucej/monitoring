import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageHeader } from "@/components/shared/PageHeader";
import { AgentCommandCenter } from "@/components/sysadmin/agent-command-center/AgentCommandCenter";

/**
 * /sysadmin/agent-command-center — the unified AI Agent Command Center.
 *
 * Consolidates the previously-scattered agent/bot/automation/infra surfaces
 * (operator-action approvals, autonomous kill-switches + forecasts, the @agent
 * live-activity trace feed, the RAG knowledge base, and the infra/worker/tools
 * fleet) into a single HeroUI v3 5-tab hub under one sysadmin shell.
 *
 * Read-only overview + control (approvals / kill-switches / toggles). All data
 * is real (fetched from the existing admin/sysadmin APIs); no mock data, no
 * silent failure-swallowing — every panel surfaces an explicit retryable
 * error or an empty state.
 *
 * Gated: sysadmin + admin only (the shell provides the outer nav; this page
 * does not render a second sidebar/topbar).
 */
export default function AgentCommandCenterPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <PageHeader
        title="AI Agent Command Center"
        subtitle="Unified oversight of agents, automations, knowledge base, and infrastructure — one hub, no nested navigation."
      />
      <AgentCommandCenter />
    </AuthGuard>
  );
}
