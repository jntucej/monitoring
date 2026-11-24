"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { IncidentsView } from "../../_shared/IncidentsView";

export default function Page() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Principal"
        purpose="Investigate campus-wide security incidents, perimeter breaches, and disciplinary emergencies"
        contextLabel="Security Incidents Center"
        statusSummary="Review serious institutional incident reports, coordinate emergency actions, and audit investigations."
        severity="critical"
        primaryAction={{ label: "Emergency Command", href: "/principal/emergency" }}
        secondaryAction={{ label: "Case Register", href: "/principal/cases" }}
      />
      <IncidentsView />
    </div>
  );
}
