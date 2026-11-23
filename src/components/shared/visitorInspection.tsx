"use client";

/**
 * visitorInspection — build `EntityInspection` models for the visitor
 * portal record shapes (from `/api/visitors/mine` + `/api/visitors/[id]`).
 *
 * Per the PR-05G rule: visitor surfaces are read-only. These models
 * expose **inspect + context only** — they surface the record's facts
 * and link to the visitor's own portal pages, but they do NOT invent
 * write actions (a visitor cannot approve/escalate; they can only
 * check in/out, which the visit surface already handles).
 *
 * The models follow the EntityInspection contract:
 *   sections[0] = quick overview; history = collapsible; the deepest
 *   layer is the visitor portal page (detailHref).
 */

import type { ReactNode } from "react";
import {
  KVPairs,
  Timeline,
  type EntityInspection,
  type InspectionSection,
} from "@/components/shared/EntityInspector";
import type { VisitorLogRow } from "@/app/visitor/types";

function statusPill(text: string, tone: "ok" | "warn" | "neutral") {
  const cls: Record<string, string> = {
    ok: "bg-emerald-500/10 text-action-success border border-emerald-500/20",
    warn: "bg-amber-500/10 text-action-warning border border-amber-500/20",
    neutral: "bg-bg-elevated text-text-muted border border-border",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${cls[tone]}`}>
      {text}
    </span>
  );
}

function fmtAt(iso: string | null): string | undefined {
  return iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : undefined;
}

/**
 * Build the `EntityInspection` model for a single visitor visit-log row.
 * Used by the visitor history + active-visit surfaces.
 *
 * Read-only: sections expose the visit's facts (host, purpose, times,
 * status) and link back into the visitor portal. No write actions.
 */
export function visitorVisitInspection(log: VisitorLogRow): EntityInspection {
  const inAt = fmtAt(log.check_in_at);
  const outAt = fmtAt(log.check_out_at);
  const isActive = !!log.check_in_at && !log.check_out_at;
  const hostName = log.host?.name;

  const sections: InspectionSection[] = [
    {
      title: "Overview",
      content: (
        <KVPairs
          items={[
            { label: "Host", value: hostName ?? "Not recorded" },
            { label: "Purpose", value: log.purpose ?? "—" },
            { label: "Checked in", value: inAt ?? "—" },
            { label: "Checked out", value: outAt ?? (isActive ? "in progress" : "—") },
            { label: "Visitor ID", value: log.person?.unique_id ?? "—" },
            { label: "Visitor", value: log.person?.name ?? "—" },
          ]}
        />
      ),
    },
  ];

  // A single visit has a short two-event "history" (in → out). When the
  // visit is still active we keep it non-collapsible (it's brief); when
  // completed we mark it collapsible per the long-section rule.
  const events = [
    { label: "Checked in", time: inAt, tone: ("neutral" as const) },
    outAt ? { label: "Checked out", time: outAt, tone: ("ok" as const) } : { label: "On campus", time: "in progress", tone: ("warn" as const) },
  ];
  sections.push({
    title: "History",
    collapsible: !isActive,
    content: <Timeline items={events} />,
  });

  return {
    kind: "visitor",
    title: hostName ? `Visit to ${hostName}` : "Visitor visit",
    subtitle: log.person?.name ?? log.person?.unique_id ?? "You",
    status:
      log.status === "completed" || (log.check_in_at && log.check_out_at)
        ? statusPill("completed", "neutral")
        : statusPill("active", "ok"),
    sections,
    detailHref: "/visitor",
    detailLabel: "Visitor portal",
  };
}

/**
 * Build the `EntityInspection` model for the visitor's registration
 * record (from the `registration` slice of `/api/visitors/mine`).
 * Purely informational context — no actions.
 */
export function visitorRegistrationInspection(reg: {
  name: string | null;
  uniqueId: string | null;
  role: string | null;
  status: string | null;
}): EntityInspection {
  return {
    kind: "visitor",
    title: reg.name ?? "Visitor profile",
    subtitle: reg.uniqueId ?? undefined,
    status: statusPill(reg.status ?? "active", "neutral"),
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Name", value: reg.name ?? "—" },
              { label: "ID", value: reg.uniqueId ?? "—" },
              { label: "Role", value: reg.role ?? "—" },
              { label: "Status", value: reg.status ?? "—" },
            ]}
          />
        ),
      },
    ],
    detailHref: "/visitor/registration",
    detailLabel: "Registration",
  };
}

export type { ReactNode };
