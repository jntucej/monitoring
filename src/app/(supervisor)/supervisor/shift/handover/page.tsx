"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ShiftHandoverView } from "../../_shared/ShiftHandoverView";

export default function ShiftHandoverPage() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Gate Supervisor"
        purpose="Facilitate seamless operational briefing, outstanding issue transfer, and shift sign-off"
        contextLabel="Shift Handover Console"
        statusSummary="Document unresolved security items, ongoing gate maintenance, and brief incoming shift leadership."
        primaryAction={{ label: "Live Shift Desk", href: "/supervisor/shift/live" }}
        secondaryAction={{ label: "Shift History", href: "/supervisor/shift/history" }}
      />
      <ShiftHandoverView />
    </div>
  );
}
