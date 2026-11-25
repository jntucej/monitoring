"use client";

import { CircularPipelinePanel } from "@/components/circulars/CircularPipelinePanel";

export default function PrincipalCircularsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-xl font-bold text-foreground">Principal Circular Approvals & Compliance</h1>
      <CircularPipelinePanel canApprove={true} />
    </div>
  );
}
