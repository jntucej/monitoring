"use client";
import { GateSchedule } from "@/components/admin/GateSchedule";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function GateSchedulePage() {
  return (
    
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Manage and monitor gates schedule for campus operations."
        contextLabel="Gates Schedule"
        statusSummary="Review current gates schedule state and take action below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
        secondaryAction={{ label: "Campus Reports", href: "/admin/reports" }}
      />
        <GateSchedule />
      </div>
    
    

  );
}
