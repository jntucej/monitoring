import type { EntityInspection } from "@/components/shared/EntityInspector";
import { KVPairs, Timeline, InspectorButton } from "@/components/shared/EntityInspector";
import { ExternalLink } from "lucide-react";


// ── gate pass (GatePass) ─────────────────────────────────────────────

export interface PassModel {
  id: string;
  roll: string;
  studentName: string;
  department: string;
  reason: string;
  from: string;
  to: string;
  description?: string;
  requestedByName?: string;
  requestedAt?: string;
  parentStatus: string;
  adminStatus: string;
  finalStatus: string;
  parentComment?: string;
  adminComment?: string;
}

/** Standardized inspection for a gate pass: overview → approval loop → timeline. */
export function passInspection(pass: PassModel): EntityInspection {
  const active = !/rejected|completed|expired|cancelled/i.test(pass.finalStatus);
  return {
    kind: "gate pass",
    title: pass.studentName || pass.roll,
    subtitle: pass.roll,
    status: (
      <span
        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
          active
            ? "bg-emerald-500/15 text-action-success"
            : /rejected|denied/i.test(pass.finalStatus)
              ? "bg-rose-500/15 text-action-danger"
              : "bg-bg-elevated text-text-muted"
        }`}
      >
        {pass.finalStatus}
      </span>
    ),
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Reason", value: pass.reason },
              { label: "Department", value: pass.department },
              ...(pass.description ? [{ label: "Note", value: pass.description }] : []),
              {
                label: "Valid",
                value: `${new Date(pass.from).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} → ${new Date(pass.to).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`,
              },
            ]}
          />
        ),
      },
      {
        title: "Approval loop",
        content: (
          <KVPairs
            items={[
              {
                label: "Parent",
                value: (
                  <span className={`font-bold ${pass.parentStatus === "APPROVED" ? "text-action-success" : "text-action-warning"}`}>
                    {pass.parentStatus}
                  </span>
                ),
              },
              {
                label: "Admin",
                value: (
                  <span className={`font-bold ${pass.adminStatus === "APPROVED" ? "text-action-success" : "text-action-warning"}`}>
                    {pass.adminStatus}
                  </span>
                ),
              },
              ...(pass.parentComment ? [{ label: "Parent note", value: pass.parentComment }] : []),
              ...(pass.adminComment ? [{ label: "Admin note", value: pass.adminComment }] : []),
            ]}
          />
        ),
      },
      {
        title: "Timeline",
        collapsible: true,
        content: (
          <Timeline
            items={[
              {
                label: `Requested by ${pass.requestedByName ?? "unknown"}`,
                time: pass.requestedAt ? new Date(pass.requestedAt).toLocaleString("en-IN") : undefined,
                tone: "neutral",
              },
              ...(pass.parentStatus !== "PENDING"
                ? [{ label: `Parent: ${pass.parentStatus}`, tone: (pass.parentStatus === "APPROVED" ? "ok" : "warn") as "ok" | "warn" }]
                : []),
              ...(pass.adminStatus !== "PENDING"
                ? [{ label: `Admin: ${pass.adminStatus}`, tone: (pass.adminStatus === "APPROVED" ? "ok" : "warn") as "ok" | "warn" }]
                : []),
            ]}
          />
        ),
      },
      {
        title: "Actions",
        content: (
          <div className="flex flex-wrap gap-2">
            <InspectorButton href={`/admin/students/${pass.roll}`} variant="ghost">
              <ExternalLink className="size-3.5" /> Student record
            </InspectorButton>
          </div>
        ),
      },
    ],
  };
}
