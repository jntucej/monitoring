import { redirect } from "next/navigation";

// Consolidated into the guardian portal. /guardian/pass-leave-submission is
// the single source of truth for initiating/approving leave + outpass
// requests on behalf of the ward.
export default function ParentPassLeaveSubmissionRedirect() {
  redirect("/guardian/pass-leave-submission");
}
