"use client";

import { useSearchParams } from "next/navigation";
import { ApprovalsView } from "../_shared/ApprovalsView";

export default function PrincipalApprovalsPage() {
  // KPI drilldowns (?workflowType=hostel) land here pre-filtered on the
  // underlying records — the metric card is a gateway, not a dead number.
  const searchParams = useSearchParams();
  const workflowType = searchParams.get("workflowType") ?? undefined;
  return (
    <ApprovalsView status="PENDING" title="Pending approvals" workflowType={workflowType} />
  );
}
