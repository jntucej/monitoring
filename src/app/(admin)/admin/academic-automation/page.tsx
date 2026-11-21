"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Zap,
  Lock,
  Power,
  GitCommitVertical,
} from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { EmptyState } from "@/components/admin/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/utils";

// ── Types (mirror the API) ─────────────────────────────────────────────────
interface Rule {
  id: string;
  code: string;
  name: string;
  event: string;
  scope_type: string;
  scope_id: string | null;
  conditions: any;
  actions: any[];
  follow_up: any | null;
  escalate_role: string | null;
  autonomy_level: number;
  requires_approval: boolean;
  is_active: boolean;
  version: number;
  updated_at: string;
}
interface Agent {
  code: string;
  name: string;
  purpose: string | null;
  trigger_type: string;
  autonomy_level: number;
  allowed_actions: string[];
  is_active: boolean;
}
interface Control {
  name: string;
  enabled: boolean;
  reason: string | null;
}
interface Run {
  id: string;
  agent_code: string | null;
  rule_code: string | null;
  event: string;
  outcome: string;
  explanation: any;
  run_at: string;
}
interface Level {
  level: number;
  code: string;
  description: string;
  requires_approval: boolean;
}

const AUTONOMY_LABELS: Record<number, string> = {
  0: "L0 observe", 1: "L1 recommend", 2: "L2 notify", 3: "L3 create task",
  4: "L4 route", 5: "L5 reversible", 6: "L6 irreversible",
};

function AutonomyPanel() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ code: "", name: "", event: "", conditions: '{"attendance.percent":75,"op":"<"}', actions: '[{"type":"create_case","params":{"case_type":"attendance_risk"}}]', autonomy_level: 2, requires_approval: false, scope_type: "institution", escalate_role: "" });
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/academic-automation?runs=1&agents=1&levels=1", { headers: getAuthHeaders() });
      const body = await res.json();
      const d = body?.data ?? {};
      setRules(d.rules ?? []);
      setAgents(d.agents ?? []);
      setControls(d.controls ?? []);
      setLevels(d.autonomy_levels ?? []);
      setRuns(d.recent_runs ?? []);
    } catch (e) {
      console.error("automation load", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const post = useCallback(async (path: string, payload: any) => {
    const res = await fetch(`/api/academic-automation${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    return res;
  }, []);

  const createRule = useCallback(async () => {
    setSaved(null);
    const res = await post("/rule", {
      code: draft.code,
      name: draft.name,
      event: draft.event,
      scope_type: draft.scope_type || "institution",
      scope_id: draft.scope_type !== "institution" ? draft.code : null,
      conditions: JSON.parse(draft.conditions || "{}"),
      actions: JSON.parse(draft.actions || "[]"),
      autonomy_level: Number(draft.autonomy_level),
      requires_approval: !!draft.requires_approval,
      escalate_role: draft.escalate_role || null,
      follow_up: draft.escalate_role ? { escalate_role: draft.escalate_role, after_hours: 24 } : null,
    });
    if (res.ok) { setSaved("Rule saved (versioned)"); load(); }
    else setSaved("Save failed: " + (await res.text()));
  }, [draft, post, load]);

  const toggleAgent = useCallback((code: string, enabled: boolean) => {
    post("/toggle", { name: code, enabled, reason: enabled ? "re-enabled by admin" : "killed by admin" }).then(() => load());
  }, [post, load]);

  const setOverride = useCallback((key: string, value: any, clear = false) => {
    post("/override", { key, value, clear }).then(() => load());
  }, [post, load]);

  if (loading) return <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-32" /><Skeleton className="h-32" /></div>;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Rule Builder */}
      <WidgetBoundary title="Rule Builder">
        <div className="space-y-2">
          {(["code", "name", "event"] as const).map((f) => (
            <input key={f} value={draft[f]} placeholder={f}
              onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}
              className="w-full border border-border px-2 py-1.5 text-sm" />
          ))}
          <textarea value={draft.conditions} placeholder="conditions JSON" rows={3}
            onChange={(e) => setDraft({ ...draft, conditions: e.target.value })}
            className="w-full rounded-md border border-border bg-bg-surface px-2 py-1.5 text-sm font-mono" />
          <textarea value={draft.actions} placeholder="actions JSON" rows={3}
            onChange={(e) => setDraft({ ...draft, actions: e.target.value })}
            className="w-full rounded-md border border-border bg-bg-surface px-2 py-1.5 text-sm font-mono" />
          <div className="flex flex-wrap gap-3">
            <label className="text-xs">Autonomy
              <select value={draft.autonomy_level} onChange={(e) => setDraft({ ...draft, autonomy_level: Number(e.target.value) })}
                className="ml-2 border border-border px-2 py-1 text-sm">
                {[0,1,2,3,4,5,6].map((l) => <option key={l} value={l}>{AUTONOMY_LABELS[l]}</option>)}
              </select>
            </label>
            <label className="text-xs"><input type="checkbox" checked={draft.requires_approval} onChange={(e) => setDraft({ ...draft, requires_approval: e.target.checked })} /> requires approval</label>
            <input value={draft.escalate_role} placeholder="escalate_role" className="border border-border px-2 py-1 text-xs w-28"
              onChange={(e) => setDraft({ ...draft, escalate_role: e.target.value })} />
          </div>
          <Button onClick={createRule} size="sm"><GitCommitVertical className="h-4 w-4" /> Save + version</Button>
          {saved && <span className="text-xs text-text-muted">{saved}</span>}
        </div>
      </WidgetBoundary>

      {/* Autonomy Control Panel */}
      <WidgetBoundary title="Autonomy Control Panel">
        <div className="space-y-2 text-sm">
          {agents.map((a) => {
            const ctl = controls.find((c) => c.name === a.code);
            const on = ctl ? ctl.enabled : true;
            return (
              <div key={a.code} className="flex items-center justify-between py-2">
                <div>
                  <div className="flex items-center gap-2">
                    {on ? <Zap className="h-3.5 w-3.5 text-emerald-400" /> : <Lock className="h-3.5 w-3.5 text-rose-400" />}
                    <span className="font-medium">{a.name}</span>
                    <span className="text-xs text-text-muted">{AUTONOMY_LABELS[a.autonomy_level] ?? `L${a.autonomy_level}`}</span>
                  </div>
                  <div className="text-xs text-text-secondary">{a.allowed_actions?.join(", ")}</div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => toggleAgent(a.code, !on)}>
                  <Power className="h-3.5 w-3.5" /> {on ? "Disable" : "Enable"}
                </Button>
              </div>
            );
          })}
          {agents.length === 0 && <EmptyState title="No agents registered" />}
        </div>
      </WidgetBoundary>

      {/* Active rules */}
      <WidgetBoundary title={`Policy Rules (${rules.length})`}>
        <div className="space-y-2">
          {rules.map((r) => (
            <div key={r.id} className={`py-2 text-sm ${r.is_active ? "" : "opacity-60"}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{r.name}</span>
                <span className="text-xs text-text-muted">{AUTONOMY_LABELS[r.autonomy_level] ?? `L${r.autonomy_level}`}{r.requires_approval ? " · approval" : ""}</span>
              </div>
              <div className="text-xs text-text-secondary">{r.event} · {r.scope_type}{r.scope_id ? ":" + r.scope_id : ""} · v{r.version}</div>
            </div>
          ))}
          {rules.length === 0 && <EmptyState title="No policy rules yet — use the Rule Builder" />}
        </div>
      </WidgetBoundary>

      {/* Explain-why / audit */}
      <WidgetBoundary title="Autonomy Decisions (explain-why)">
        <div className="max-h-72 space-y-2 overflow-auto">
          {runs.map((r) => (
            <div key={r.id} className="py-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-text-primary">{r.rule_code ?? r.agent_code}</span>
                <span className={r.outcome === "fired" ? "text-text-primary" : r.outcome === "skipped" ? "text-text-muted" : "text-text-primary"}>{r.outcome}</span>
              </div>
              <div className="text-xs text-text-secondary">{r.event} → {r.explanation?.action_summary || "no action"}</div>
            </div>
          ))}
          {runs.length === 0 && <EmptyState title="No autonomous runs yet" />}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function AcademicAutomationPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <PageHeader
        title="Academic Automation"
        subtitle="Configuration-driven workflow engine: rules, autonomy levels, kill-switch, and explain-why audit. No deploy for policy changes."
      />
      <AutonomyPanel />
    </AuthGuard>
  );
}
