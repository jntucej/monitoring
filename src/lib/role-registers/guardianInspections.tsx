/**
 * Role register inspection builders for GUARDIAN (parent) role:
 * - Child Requests (/guardian/child-requests)
 * - Child Status / Ward Presence (/guardian/child-status)
 * - Ward Gate Activity Scans (/guardian/child-status)
 *
 * Strict adherence to:
 * - Records are gateways (overview → context → actions)
 * - No invented actions or relationships
 * - Real API endpoints and authorized roles only:
 *   - /api/parent/leave/acknowledge (if warden-approved leave request)
 *   - /api/guardian/links/reverify (guardian link re-verification)
 *   - Child requests: inspect + honest "Waiting for decision by school" if not actionable
 *   - Child status: inspect (attendance/health/presence), inspect-only
 */
import type {
  EntityInspection,
  InspectionSection,
} from "@/components/shared/EntityInspector";
import type { Person, Scan } from "@/lib/types";

function when(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function kv(title: string, pairs: Array<[string, React.ReactNode]>): InspectionSection {
  return {
    title,
    content: (
      <dl className="space-y-1.5">
        {pairs.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-text-muted">{k}</dt>
            <dd className="text-sm text-text-primary">{v ?? "—"}</dd>
          </div>
        ))}
      </dl>
    ),
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 1. Guardian: Child Request Inspection
 * Represents a pass, leave, or permission request filed by or for a ward.
 * ───────────────────────────────────────────────────────────────────────────── */

export interface GuardianChildRequestRecord {
  id: string;
  ticket_number?: string;
  workflow_type?: string;
  status?: string;
  student_user_id?: string | null;
  current_stage?: string;
  sla_deadline?: string | null;
  created_at?: string;
  student?: {
    name?: string;
    student_details?: { roll?: string } | null;
  } | null;
}

export function buildGuardianChildRequestInspection(
  row: GuardianChildRequestRecord,
): EntityInspection {
  const ticket = row.ticket_number || row.id.slice(0, 8);
  const wardName = row.student?.name || "Linked Ward";
  const roll = row.student?.student_details?.roll;
  const status = (row.status ?? "PENDING").toUpperCase();
  const stage = (row.current_stage ?? "—").toUpperCase();
  const workflow = (row.workflow_type ?? "leave").replace(/_/g, " ");

  const isWardenApprovedLeave =
    workflow.includes("leave") &&
    (stage === "PARENT_ACKNOWLEDGE" || stage === "WARDEN_APPROVED");

  const sections: InspectionSection[] = [
    kv("Overview", [
      ["Ticket Number", <span className="font-mono">{ticket}</span>],
      ["Ward", roll ? `${wardName} (${roll})` : wardName],
      ["Workflow Type", workflow],
      ["Current Stage", row.current_stage ?? "—"],
      ["Status", status],
      ["Submitted At", when(row.created_at)],
      ["SLA Deadline", when(row.sla_deadline)],
    ]),
    {
      title: "Context & Relationships",
      content: (
        <div className="space-y-1.5 text-xs text-text-muted">
          <p>
            Request submitted for ward <span className="text-text-primary font-medium">{wardName}</span>.
          </p>
          <p>
            Campus leave and gate pass requests follow the institution&apos;s administrative workflow
            chain (Warden / Class Coordinator / HOD / Principal).
          </p>
        </div>
      ),
    },
    {
      title: "Actions",
      content: (
        <div className="space-y-2">
          {isWardenApprovedLeave ? (
            <div className="space-y-1.5">
              <p className="text-xs text-action-warning font-medium">
                Hostel Warden approved — awaiting Guardian acknowledgement.
              </p>
              <p className="text-xs text-text-muted">
                You can acknowledge this leave request via the verified endpoint:
                <code className="ml-1 text-[11px] text-text-secondary">/api/parent/leave/acknowledge</code>
              </p>
            </div>
          ) : (
            <p className="text-xs text-text-muted">
              Inspection only — waiting for decision by school / approver workflow.
            </p>
          )}
          <a
            href={`/guardian/request-status?ticket=${encodeURIComponent(row.ticket_number || row.id)}`}
            className="inline-block text-xs font-semibold text-action-primary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none rounded"
          >
            Track request timeline →
          </a>
        </div>
      ),
    },
  ];

  return {
    kind: "child_request",
    title: `${workflow.charAt(0).toUpperCase() + workflow.slice(1)} · ${wardName}`,
    subtitle: ticket,
    status: (
      <span className="text-xs font-semibold text-text-muted">
        {status}
      </span>
    ),
    sections,
    detailHref: `/guardian/request-status?ticket=${encodeURIComponent(row.ticket_number || row.id)}`,
    detailLabel: "Track full timeline",
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 2. Guardian: Ward Presence / Child Status Inspection
 * Represents the live campus presence, location, and link status of a ward.
 * ───────────────────────────────────────────────────────────────────────────── */

export interface WardStatusSnapshot {
  campusStatus: string;
  lastScan: { timestamp: string; gateName: string } | null;
}

export function buildGuardianWardStatusInspection(
  ward: Person,
  status: WardStatusSnapshot | null,
): EntityInspection {
  const name = ward.fullName || ward.name || "Linked Ward";
  const roll = ward.uniqueId || ward.roll || "—";
  const isOnCampus = status?.campusStatus === "IN";
  const presenceText = isOnCampus ? "On campus" : (status?.campusStatus === "OUT" ? "Off campus" : "Unknown");

  const lastSeen = status?.lastScan
    ? `${status.lastScan.gateName} at ${when(status.lastScan.timestamp)}`
    : "No recent scan recorded";

  const sections: InspectionSection[] = [
    kv("Overview", [
      ["Student Name", name],
      ["Roll / Unique ID", <span className="font-mono">{roll}</span>],
      ["Campus Status", presenceText],
      ["Last Gate Activity", lastSeen],
      ["Department", ward.department ?? "—"],
      ["Hostel Block / Room", ward.hostelBlock ? `${ward.hostelBlock}${ward.roomNumber ? ` / ${ward.roomNumber}` : ""}` : "Day Scholar"],
    ]),
    {
      title: "Context & Relationships",
      content: (
        <div className="space-y-1.5 text-xs text-text-muted">
          <p>
            Ward mapped to guardian account. Attendance and entry/exit timestamps are recorded at registered campus gates.
          </p>
          <p>
            Guardian linkage status can be re-verified through the guardian link registry
            (<code className="text-[11px] text-text-secondary">/api/guardian/links/reverify</code>).
          </p>
        </div>
      ),
    },
    {
      title: "Actions",
      content: (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">
            Inspection only — ward status reflects real-time gate telemetry.
          </p>
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
            <a
              href={`/guardian/child-attendance`}
              className="inline-block text-xs font-semibold text-action-primary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none rounded"
            >
              View 7-day attendance →
            </a>
            <a
              href={`/guardian/pass-leave-submission`}
              className="inline-block text-xs font-semibold text-action-primary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none rounded"
            >
              Submit pass/leave request →
            </a>
          </div>
        </div>
      ),
    },
  ];

  return {
    kind: "ward_status",
    title: name,
    subtitle: roll,
    status: (
      <span
        className={`text-xs font-semibold ${
          isOnCampus ? "text-action-success" : "text-action-danger"
        }`}
      >
        {presenceText}
      </span>
    ),
    sections,
    detailHref: `/guardian/child-attendance`,
    detailLabel: "Open attendance review",
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 3. Guardian: Ward Gate Scan Activity Inspection
 * Represents a single gate scan event for a ward.
 * ───────────────────────────────────────────────────────────────────────────── */

export function buildGuardianScanActivityInspection(
  scan: Scan,
  wardName?: string | null,
): EntityInspection {
  const isIn = scan.direction === "IN";
  const dirLabel = isIn ? "Entry (IN)" : "Exit (OUT)";
  const student = wardName || scan.name || scan.roll || "Ward";

  const sections: InspectionSection[] = [
    kv("Overview", [
      ["Ward", student],
      ["Roll Number", <span className="font-mono">{scan.roll || scan.uniqueId || "—"}</span>],
      ["Gate", scan.gateName || "Campus Gate"],
      ["Direction", dirLabel],
      ["Timestamp", when(scan.timestamp)],
      ["Scan Mode", scan.isManual ? "Manual entry" : "Automated scan"],
    ]),
    {
      title: "Context & Relationships",
      content: (
        <p className="text-xs text-text-muted">
          Authenticated gate turnstile event logged in the campus access ledger.
        </p>
      ),
    },
    {
      title: "Actions",
      content: (
        <p className="text-xs text-text-muted">
          Inspection only — historical gate transit log is tamper-evident and read-only.
        </p>
      ),
    },
  ];

  return {
    kind: "gate_scan",
    title: `${dirLabel} · ${scan.gateName || "Gate"}`,
    subtitle: `${student} · ${when(scan.timestamp)}`,
    status: (
      <span
        className={`text-xs font-semibold ${
          isIn ? "text-action-success" : "text-action-danger"
        }`}
      >
        {dirLabel}
      </span>
    ),
    sections,
  };
}
