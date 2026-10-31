import { redirect } from "next/navigation";

// Consolidated into the guardian portal. /guardian/child-requests is the
// single source of truth for leave/outpass/permission request lists.
export default function ParentChildRequestsRedirect() {
  redirect("/guardian/child-requests");
}
