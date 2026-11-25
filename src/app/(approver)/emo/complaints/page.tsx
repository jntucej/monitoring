"use client";
// src/app/(approver)/emo/complaints/page.tsx
import { ComplaintConsole } from "@/components/complaints/ComplaintConsole";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <ContextSituationBar
        roleLabel="Electrical Maintenance Officer"
        purpose="Review electrical complaints, assign technicians, and log repair completions"
        why="Triaging power outages and electrical hazards promptly prevents facility disruptions and safety risks."
        contextLabel="Electrical Complaints Console"
        statusSummary="Monitor and resolve electrical tickets across labs, departments, and residential blocks."
        severity="info"
        primaryAction={{ label: "EMO Dashboard", href: "/emo" }}
        secondaryAction={{ label: "Resolved Tickets", href: "/emo/complaints?status=resolved" }}
      />
      <ComplaintConsole role="emo" basePath="/emo/complaints" title="Electrical Maintenance Queue" />
    </div>
  );
}
