"use client";
// src/components/sysadmin/domains/identity/PeopleDrawer.tsx
// PEOPLE deepest layer: fetches the single-person payload from
// /api/admin/people/<id> and renders it through the shared EntityInspector
// (kind `person`). The progressive-disclosure hierarchy is the same as
// every other record in the app: overview → roles → sessions → audit →
// links (server-authorized mutation routes).
// Loading / error / not-found states are exposed through the
// inspector's built-in state placeholders (design rule 31).

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { EntityInspector, KVPairs, InspectorButton, Timeline, type EntityInspection } from "@/components/shared/EntityInspector";
import type {
  PersonDetail,
  PersonRow,
} from "@/components/sysadmin/domains/identity/types";

interface Props {
  /** The row that was clicked; drives which person to fetch. Null = closed. */
  row?: PersonRow | null;
  /** Sibling-surface convenience: open by id only (a minimal PersonRow is built). */
  personId?: string | null;
  onClose: () => void;
}

type LoadState = "idle" | "loading" | "ready" | "error";

function stateTone(state: string): "ok" | "warn" | "danger" | "neutral" {
  const s = state.toUpperCase();
  if (s === "ACTIVE") return "ok";
  if (s === "SUSPENDED" || s === "LOCKED") return "danger";
  if (s === "DISABLED" || s === "DEPROVISIONED") return "neutral";
  return "warn";
}

function stateClass(tone: "ok" | "warn" | "danger" | "neutral"): string {
  switch (tone) {
    case "ok":
      return "bg-emerald-500/15 text-action-success";
    case "warn":
      return "bg-amber-500/15 text-action-warning";
    case "danger":
      return "bg-rose-500/15 text-action-danger";
    default:
      return "bg-bg-elevated text-text-muted";
  }
}

/** Build the standardized `EntityInspection` model for a person record. */
function personInspectionModel(
  row: PersonRow,
  detail: PersonDetail | null,
): EntityInspection {
  const name = detail?.name ?? row.name;
  const email = detail?.email ?? row.email;
  const role = detail?.role ?? row.role;
  const state = detail?.state ?? row.state;
  const tone = stateTone(state);

  const sections: EntityInspection["sections"] = [
    {
      title: "Overview",
      content: (
        <KVPairs
          items={[
            { label: "Email", value: email },
            { label: "Role", value: role },
            { label: "State", value: state },
            {
              label: "MFA",
              value: (detail?.two_factor_enabled ?? row.two_factor_enabled)
                ? "Enabled"
                : "Disabled",
            },
            {
              label: "Created",
              value: new Date(detail?.created_at ?? row.created_at).toLocaleDateString("en-IN"),
            },
          ]}
        />
      ),
    },
    ...(detail
      ? [
          {
            title: `Roles (${detail.roles.length})`,
            collapsible: true,
            content:
              detail.roles.length === 0 ? (
                <p className="text-xs text-text-muted">No roles recorded.</p>
              ) : (
                <Timeline
                  items={detail.roles.map((r) => ({
                    label: r.role,
                    time: new Date(r.granted_at).toLocaleDateString("en-IN"),
                    detail: "granted",
                    tone: "neutral" as const,
                  }))}
                />
              ),
          },
          {
            title: `Sessions (${detail.sessionsCount})`,
            collapsible: true,
            content:
              detail.sessions.length === 0 ? (
                <p className="text-xs text-text-muted">No sessions.</p>
              ) : (
                <Timeline
                  items={detail.sessions.map((s) => ({
                    label: s.revoked_at ? "Session revoked" : "Active session",
                    time: s.last_seen_at
                      ? new Date(s.last_seen_at).toLocaleString("en-IN")
                      : undefined,
                    detail: [s.ip_address, s.user_agent].filter(Boolean).join(" · "),
                    tone: s.revoked_at ? ("neutral" as const) : ("ok" as const),
                  }))}
                />
              ),
          },
          {
            title: "Recent audit",
            collapsible: true,
            content:
              detail.audit.length === 0 ? (
                <p className="text-xs text-text-muted">No audit entries.</p>
              ) : (
                <Timeline
                  items={detail.audit.map((a) => ({
                    label: a.action,
                    time: new Date(a.timestamp).toLocaleString("en-IN"),
                    detail: a.ip_address ?? undefined,
                    tone: "neutral" as const,
                  }))}
                />
              ),
          },
        ]
      : []),
    {
      title: "Actions",
      content: (
        <div className="flex flex-wrap gap-2">
          {detail ? (
            <>
              <InspectorButton href={detail.links.users} variant="ghost">
                <ChevronRight className="size-3.5" /> User record
              </InspectorButton>
              <InspectorButton href={detail.links.userRoles} variant="ghost">
                <ChevronRight className="size-3.5" /> Roles
              </InspectorButton>
              <InspectorButton href={detail.links.roleRequests} variant="ghost">
                <ChevronRight className="size-3.5" /> Role requests
              </InspectorButton>
              <InspectorButton href={detail.links.auditLogs} variant="ghost">
                <ChevronRight className="size-3.5" /> Audit logs
              </InspectorButton>
            </>
          ) : (
            <p className="text-xs text-text-muted">
              Open a role mutation (grant / revoke / suspend) from the sysadmin
              role console — the server authorizes these routes.
            </p>
          )}
        </div>
      ),
    },
  ];

  return {
    kind: "person",
    title: name,
    subtitle: email,
    status: (
      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${stateClass(tone)}`}>
        {state.toUpperCase()}
      </span>
    ),
    sections,
    detailHref: "/sysadmin/people",
    detailLabel: "People directory",
  };
}

export function PeopleDrawer({ row, personId, onClose }: Props) {
  // Normalize to a single "active" row: prefer `row`; else build one from
  // `personId` (sibling pages that pass only the id).
  const activeRow = row ?? (personId ? { id: personId } as PersonRow : null);
  const [detail, setDetail] = useState<PersonDetail | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeRow) {
      setDetail(null);
      setState("idle");
      return;
    }
    let cancelled = false;
    setState("loading");
    setError(null);
    fetch(`/api/admin/people/${encodeURIComponent(activeRow.id)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        setDetail(json.data as PersonDetail);
        setState("ready");
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load");
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [activeRow?.id, activeRow]);

  if (!activeRow) return null;

  // While the person detail is still in flight or failed, surface the state
  // through the inspector's built-in placeholder so the panel never renders
  // blank (design rule 31).
  if (error) {
    return (
      <EntityInspector
        inspection={null}
        onClose={onClose}
        state="error"
        errorMessage={error}
      />
    );
  }
  if (state === "loading" || state === "idle" || !detail) {
    return (
      <EntityInspector inspection={null} onClose={onClose} state="loading" />
    );
  }

  const model = personInspectionModel(activeRow, detail);
  return <EntityInspector inspection={model} onClose={onClose} />;
}
