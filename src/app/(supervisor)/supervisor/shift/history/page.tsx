"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ShiftHistoryView } from "../../_shared/ShiftHistoryView";

export default function ShiftHistoryPage() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Gate Supervisor"
        purpose="Audit previous shift logs, guard attendance fidelity, and historical incident resolutions"
        contextLabel="Shift Archival History"
        statusSummary="Historical ledger of completed supervisory shifts, guard attendance logs, and handover notes."
        why="Historical shift ledgers provide verifiable records for attendance auditing, disciplinary investigations, and regulatory compliance."
        primaryAction={{ label: "Active Shift", href: "/supervisor/shift/live" }}
        secondaryAction={{ label: "Shift Handover", href: "/supervisor/shift/handover" }}
      />
      <ShiftHistoryView />
    </div>
  );
}
