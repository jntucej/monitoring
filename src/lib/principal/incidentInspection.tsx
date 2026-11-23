/**
 * PR-05A — Incident inspection builder.
 *
 * Turns a real /api/alerts row into the shared EntityInspection model so the
 * incident row is a GATEWAY into institutional context (the "records are
 * gateways" rule): overview → context (related gate/student, authority) →
 * available actions. No invented fields: every value comes from the alert
 * row or a real related-record lookup; missing related records are
 * represented honestly (unavailable, not blank).
 */
import type { EntityInspection, InspectionSection } from "@/components/shared/EntityInspector";

export interface AlertRecord {
  id: string;
  severity?: string;
  title?: string;
  message?: string;
  gateId?: string | null;
  studentRoll?: string;
  timestamp?: string;
  resolved?: boolean;
  status?: string;
}

export interface RelatedRecord {
  /** The related entity's kind (gate / student / staff / ...). */
  kind: string;
  id: string;
  label: string;
  /** Subtitle / identifier (gate code, roll number). */
  subtitle?: string | null;
  /** When the related record could not be resolved, this is set and the
   *  row is rendered honestly as "unavailable" (never a fabricated link). */
  unavailable?: string;
}

export interface IncidentActions {
  /** Real, server-supported actions only. The builder never invents a verb. */
  acknowledge?: { available: boolean; reason?: string };
  resolve?: { available: boolean; reason?: string };
}

function fmtWhen(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function unavailableSection(rel: RelatedRecord): InspectionSection {
  return {
    title: "Related record",
    content: (
      <p className="text-xs text-text-muted">
        {rel.label}: unavailable — {rel.unavailable ?? "not resolved"}
      </p>
    ),
  };
}

export interface BuildIncidentInspectionArgs {
  alert: AlertRecord;
  /** Related records resolved by the caller (gate, student, ...). */
  related: RelatedRecord[];
  /** Real, server-supported actions for this alert. */
  actions: IncidentActions;
  /** A detail href if a deeper incident page exists (omitted otherwise). */
  detailHref?: string;
  detailLabel?: string;
}

/** The plain-text status descriptor (the ReactNode `status` is the visual). */
function statusText(alert: AlertRecord): string {
  if (alert.resolved) return "RESOLVED";
  if (alert.severity === "critical" || alert.severity === "high")
    return "OPEN · " + (alert.severity?.toUpperCase() ?? "");
  return (alert.status ?? "OPEN").toUpperCase();
}

export function buildIncidentInspection({
  alert,
  related,
  actions,
  detailHref,
  detailLabel,
}: BuildIncidentInspectionArgs): EntityInspection & { statusText?: string } {
  const status = statusText(alert);

  const overview: InspectionSection = {
    title: "Overview",
    content: (
      <dl className="space-y-1.5">
        <div>
          <dt className="text-xs text-text-muted">Severity</dt>
          <dd className="text-sm text-text-primary">{alert.severity ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">Reported</dt>
          <dd className="text-sm text-text-primary">{fmtWhen(alert.timestamp)}</dd>
        </div>
        {alert.message ? (
          <div>
            <dt className="text-xs text-text-muted">Detail</dt>
            <dd className="text-sm text-text-secondary">{alert.message}</dd>
          </div>
        ) : null}
      </dl>
    ),
  };

  const context: InspectionSection = {
    title: "Context",
    content:
      related.length === 0 ? (
        <p className="text-xs text-text-muted">No related records resolved.</p>
      ) : (
        <ul className="space-y-2">
          {related.map((r, i) =>
            r.unavailable ? (
              <li key={i} className="text-xs text-text-muted">
                {r.label}: unavailable ({r.unavailable})
              </li>
            ) : (
              <li key={i} className="text-sm text-text-primary">
                <span className="text-text-muted">{r.kind}:</span> {r.label}
                {r.subtitle ? <span className="text-xs text-text-muted"> · {r.subtitle}</span> : null}
              </li>
            )
          )}
        </ul>
      ),
  };

  // Only render a Related-record section if there was anything to show.
  const sections: InspectionSection[] = [overview, context];

  const actionsSection: InspectionSection = {
    title: "Actions",
    content: (
      <div className="space-y-1.5">
        {actions.acknowledge ? (
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium ${
                actions.acknowledge.available ? "text-text-primary" : "text-text-muted"
              }`}
            >
              Acknowledge
            </span>
            {!actions.acknowledge.available && actions.acknowledge.reason ? (
              <span className="text-xs text-text-muted">— {actions.acknowledge.reason}</span>
            ) : null}
          </div>
        ) : null}
        {actions.resolve ? (
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium ${
                actions.resolve.available ? "text-text-primary" : "text-text-muted"
              }`}
            >
              Resolve
            </span>
            {!actions.resolve.available && actions.resolve.reason ? (
              <span className="text-xs text-text-muted">— {actions.resolve.reason}</span>
            ) : null}
          </div>
        ) : null}
        {!actions.acknowledge && !actions.resolve ? (
          <p className="text-xs text-text-muted">No actions are supported for this record.</p>
        ) : null}
      </div>
    ),
  };
  sections.push(actionsSection);

  // A detail page is a Level-5 link; only include it when one genuinely exists.
  return {
    kind: "incident",
    title: alert.title ?? "Institutional alert",
    subtitle: alert.id ? alert.id.slice(0, 8) : undefined,
    status: <span className="text-xs font-semibold text-text-muted">{status}</span>,
    statusText: status,
    sections,
    detailHref,
    detailLabel,
  };
}
