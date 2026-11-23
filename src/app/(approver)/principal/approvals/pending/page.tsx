import { redirect } from "next/navigation";

export default function PrincipalPendingRedirect() {
  redirect("/principal/approvals");
}

/**
 * The shared ApprovalsView (../_shared/ApprovalsView) renders the pending
 * ticket register with inline entity inspection: clicking a row builds the
 * approval EntityInspection model (kind "approval" via
 * buildApprovalInspection + ticket workflow KVPairs) and opens the shared
 * EntityInspector drawer; the ticket's action buttons live in the inspector
 * and navigate to the full ticket detail (/approver/permissions/:ticket,
 * which reads /api/permissions/:ticket — the registered "permission"
 * resolver) to act. Approve/Reject/Forward stay on the ticket page, so the
 * register rows only open the inspector (row click → inspect).
 */

