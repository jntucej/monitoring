"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import {
  Command,
  ShieldCheck,
  Network,
  BookOpen,
  Server,
  RefreshCw,
  Rocket,
} from "lucide-react";
import Overview from "@/components/sysadmin/agent-command-center/Overview";
import ApprovalsGuardrails from "@/components/sysadmin/agent-command-center/ApprovalsGuardrails";
import TracesFunnel from "@/components/sysadmin/agent-command-center/TracesFunnel";
import KnowledgeBase from "@/components/sysadmin/agent-command-center/KnowledgeBase";
import InfraWorkers from "@/components/sysadmin/agent-command-center/InfraWorkers";
import { AutopilotMissionsClient } from "@/components/sysadmin/AutopilotMissionsClient";

/**
 * The 6-tab AI Agent Command Center. A single outer shell lives in the sysadmin
 * layout — this component is the tab content only (no second sidebar/topnav).
 *
 * Tabs:
 *   1. Overview                — KPI cards + agent-activity throughput/latency
 *   2. Approvals & Guardrails  — operator-action queue, kill-switches, forecasts
 *   3. Traces & @agent Funnel  — live activity feed + step-level trace inspection
 *   4. Knowledge Base (RAG)    — document ingestion + retrieval hits
 *   5. Infra, Workers & Tools  — fleet, observability, redis, jobs, integrations
 *   6. AUTOPILOT Missions      — control-plane missions, lifecycle transitions,
 *                                durable event history, outbox backlog
 */
const TABS = [
  { key: "overview", label: "Overview", icon: Command },
  { key: "approvals", label: "Approvals & Guardrails", icon: ShieldCheck },
  { key: "traces", label: "Traces & @agent", icon: Network },
  { key: "knowledge", label: "Knowledge Base", icon: BookOpen },
  { key: "infra", label: "Infra & Tools", icon: Server },
  { key: "autopilot", label: "AUTOPILOT", icon: Rocket },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function AgentCommandCenter() {
  const [value, setValue] = useState<TabKey>("overview");
  // Bump a shared refresh signal so a "Refresh all" re-fetches the active tab.
  const [refreshSignal, setRefreshSignal] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={value} onValueChange={(v) => setValue(v as TabKey)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs.List>
            {TABS.map(({ key, label, icon: Icon }) => (
              <Tabs.Tab key={key} value={key}>
                <Icon className="mr-1.5 h-3.5 w-3.5" />
                {label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          <button
            type="button"
            onClick={() => setRefreshSignal((n) => n + 1)}
            className="surface-card flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        <Tabs.Panel value="overview">
          <Overview refreshSignal={refreshSignal} />
        </Tabs.Panel>
        <Tabs.Panel value="approvals">
          <ApprovalsGuardrails refreshSignal={refreshSignal} />
        </Tabs.Panel>
        <Tabs.Panel value="traces">
          <TracesFunnel refreshSignal={refreshSignal} />
        </Tabs.Panel>
        <Tabs.Panel value="knowledge">
          <KnowledgeBase refreshSignal={refreshSignal} />
        </Tabs.Panel>
        <Tabs.Panel value="infra">
          <InfraWorkers refreshSignal={refreshSignal} />
        </Tabs.Panel>
        <Tabs.Panel value="autopilot">
          <AutopilotMissionsClient />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}

export default AgentCommandCenter;
