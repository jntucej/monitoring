/**
 * PR-05A — register inspection builders for the remaining Principal registers.
 *
 * Each builder turns a real record row into the shared EntityInspection model
 * so the row is a GATEWAY (overview → context → actions). No invented fields,
 * no fabricated relationships: every value comes from the row; related-record
 * lookups are optional + honest; actions only appear when the backend
 * genuinely supports them.
 */
import type {
  EntityInspection,
  InspectionSection,
} from "@/components/shared/EntityInspector";

export interface GateRecord {
  id: string;
  name: string;
  code?: string;
  status?: string;
  location?: string;
}
export interface HostelBlockRecord {
  id?: string;
  name?: string;
  block_name?: string;
  total_rooms?: number;
  capacity?: number;
  occupied?: number;
  status?: string;
}
export interface DepartmentRecord {
  code: string;
  name: string;
  hodName: string | null;
  faculty: number;
  students: number;
  ratio: number;
  attendancePct: number;
}
export interface DelegationRecord {
  id: string;
  delegate_role?: string;
  scope?: string;
  starts_at?: string;
  expires_at?: string | null;
  status?: string;
  note?: string | null;
}
export interface ExamExceptionRecord {
  id?: string;
  ticket_number?: string;
  student_name?: string;
  student?: { name?: string };
  reason?: string;
  status?: string;
  created_at?: string;
}
export interface AuditLogRecord {
  id: string;
  action: string;
  user_name?: string | null;
  user_role?: string | null;
  details?: Record<string, unknown> | null;
  timestamp: string;
}

function when(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function kv(pairs: Array<[string, React.ReactNode]>): InspectionSection {
  return {
    title: "Overview",
    content: (
      <dl className="space-y-1.5">
        {pairs.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-text-muted">{k}</dt>
            <dd className="text-sm text-text-primary">{v}</dd>
          </div>
        ))}
      </dl>
    ),
  };
}

function nav(href: string, label: string): InspectionSection {
  return {
    title: "Action",
    content: (
      <a
        href={href}
        className="text-sm text-action-primary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none rounded"
      >
        {label} →
      </a>
    ),
  };
}

/* ── Gate ─────────────────────────────────────────────────────────────── */
export function buildGateInspection(gate: GateRecord): EntityInspection {
  const active = gate.status === "ACTIVE" || !gate.status;
  const sections: InspectionSection[] = [
    kv([
      ["Name", gate.name],
      ["Code", gate.code ?? "—"],
      ["Location", gate.location ?? "—"],
      ["Status", active ? "Online" : (gate.status ?? "Unknown")],
    ]),
    nav(`/principal/operations/gates?gate=${encodeURIComponent(gate.id)}`, "View gate detail"),
  ];
  return {
    kind: "gate",
    title: gate.name,
    subtitle: gate.code ?? gate.id.slice(0, 8),
    status: <span className="text-xs font-semibold text-text-muted">{gate.status ?? "ONLINE"}</span>,
    sections,
    detailHref: `/principal/operations/gates?gate=${encodeURIComponent(gate.id)}`,
    detailLabel: "Open gate detail",
  };
}

/* ── Hostel block ─────────────────────────────────────────────────────── */
export function buildHostelInspection(block: HostelBlockRecord): EntityInspection {
  const name = block.name ?? block.block_name ?? "Hostel block";
  const occ = block.occupied ?? 0;
  const cap = block.capacity ?? 0;
  const sections: InspectionSection[] = [
    kv([
      ["Occupancy", `${occ} / ${cap}`],
      ["Rooms", block.total_rooms ?? "—"],
      ["Status", block.status ?? "—"],
    ]),
    nav(`/principal/operations/hostel?block=${encodeURIComponent(name)}`, "View hostel activity"),
  ];
  return {
    kind: "hostel",
    title: name,
    subtitle: block.id ?? name,
    status: <span className="text-xs font-semibold text-text-muted">{block.status ?? "NORMAL"}</span>,
    sections,
    detailHref: `/principal/operations/hostel?block=${encodeURIComponent(name)}`,
    detailLabel: "Open hostel detail",
  };
}

/* ── Department ───────────────────────────────────────────────────────── */
export function buildDepartmentInspection(dep: DepartmentRecord): EntityInspection {
  const sections: InspectionSection[] = [
    kv([
      ["Faculty", dep.faculty],
      ["Students", dep.students],
      ["Faculty/student ratio", dep.ratio ? `1:${dep.ratio}` : "—"],
      ["Attendance", `${dep.attendancePct}%`],
      ["HOD", dep.hodName ?? "—"],
    ]),
    nav(`/principal/people/departments?dept=${encodeURIComponent(dep.code)}`, "Inspect pending matters"),
  ];
  return {
    kind: "department",
    title: dep.name,
    subtitle: dep.code,
    sections,
    detailHref: `/principal/people/departments?dept=${encodeURIComponent(dep.code)}`,
    detailLabel: "Open department",
  };
}

/* ── Delegation ───────────────────────────────────────────────────────── */
export function buildDelegationInspection(del: DelegationRecord): EntityInspection {
  const active = del.status === "ACTIVE" || !del.status;
  const sections: InspectionSection[] = [
    kv([
      ["Delegate", del.delegate_role ?? "—"],
      ["Scope", del.scope ?? "—"],
      ["Starts", when(del.starts_at)],
      ["Expires", del.expires_at ? when(del.expires_at) : "No expiry"],
      ["Status", active ? "Active" : (del.status ?? "—")],
    ]),
    nav(`/principal/governance/delegations?delegation=${encodeURIComponent(del.id)}`, "Review delegation"),
  ];
  return {
    kind: "delegation",
    title: (del.delegate_role ?? "Delegation").replace(/_/g, " "),
    subtitle: del.scope ?? del.id.slice(0, 8),
    status: <span className="text-xs font-semibold text-text-muted">{del.status ?? "ACTIVE"}</span>,
    sections,
    detailHref: `/principal/governance/delegations?delegation=${encodeURIComponent(del.id)}`,
    detailLabel: "Open delegation",
  };
}

/* ── Exam exception ───────────────────────────────────────────────────── */
export function buildExamInspection(ex: ExamExceptionRecord): EntityInspection {
  const student = ex.student?.name ?? ex.student_name ?? "—";
  const pending = ex.status === "PENDING" || !ex.status;
  const sections: InspectionSection[] = [
    kv([
      ["Ticket", ex.ticket_number ?? "—"],
      ["Student", student],
      ["Reason", ex.reason ?? "—"],
      ["Created", when(ex.created_at)],
      ["Status", pending ? "Pending" : (ex.status ?? "—")],
    ]),
    nav(`/principal/examinations?case=${encodeURIComponent(ex.id ?? ex.ticket_number ?? "")}`, "Review examination case"),
  ];
  return {
    kind: "exam_case",
    title: `Exam exception · ${student}`,
    subtitle: ex.ticket_number ?? ex.id?.slice(0, 8) ?? undefined,
    status: <span className="text-xs font-semibold text-text-muted">{ex.status ?? "PENDING"}</span>,
    sections,
    detailHref: `/principal/examinations?case=${encodeURIComponent(ex.id ?? ex.ticket_number ?? "")}`,
    detailLabel: "Open examination case",
  };
}

/* ── Audit event ──────────────────────────────────────────────────────── */
export function buildAuditInspection(log: AuditLogRecord): EntityInspection {
  const sections: InspectionSection[] = [
    kv([
      ["Action", log.action],
      ["Actor", log.user_name ?? "—"],
      ["Role", log.user_role ?? "—"],
      ["When", when(log.timestamp)],
    ]),
    {
      title: "Details",
      content: log.details ? (
        <pre className="max-h-48 overflow-auto rounded bg-bg-elevated p-2 text-xs text-text-secondary">
          {JSON.stringify(log.details, null, 2)}
        </pre>
      ) : (
        <p className="text-xs text-text-muted">No structured details recorded.</p>
      ),
    },
  ];
  return {
    kind: "audit_event",
    title: log.action,
    subtitle: log.id.slice(0, 8),
    sections,
  };
}
