"use client";
// src/app/(approver)/emo/complaints/[id]/page.tsx
import { ComplaintDetail } from "@/components/complaints/ComplaintDetail";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <ContextSituationBar
        roleLabel="Electrical Maintenance Officer"
        purpose="Investigate electrical breakdown details, coordinate repair work, and document resolution"
        why="Inspecting specific fault tickets lets the EMO assign electricians and verify voltage or wiring repairs before closing."
        contextLabel="Electrical Fault Detail"
        statusSummary="Inspect reported electrical faults, assign repair crews, and record technician notes."
        severity="info"
        primaryAction={{ label: "Electrical Queue", href: "/emo/complaints" }}
        secondaryAction={{ label: "EMO Dashboard", href: "/emo" }}
      />
      <ComplaintDetail role="emo" />
    </div>
  );
}
