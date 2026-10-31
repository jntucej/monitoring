import { redirect } from "next/navigation";

// The parent-app sub-page tree is consolidated into the guardian portal.
// /guardian/child-attendance (approver route group) is the single source of
// truth; this page only redirects so deep links + stale nav entries keep
// working without duplicating the UI.
export default function ParentChildAttendanceRedirect() {
  redirect("/guardian/child-attendance");
}
