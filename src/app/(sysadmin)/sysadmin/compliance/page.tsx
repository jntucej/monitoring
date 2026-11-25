"use client";


import { AuthGuard } from "@/components/shared/AuthGuard";
import { ComplianceSettings } from "@/components/sysadmin/ComplianceSettings";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function CompliancePage() {
  return (
    <AuthGuard allowedRoles={["sysadmin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      <ContextSituationBar
        roleLabel="System Admin"
        contextLabel="Regulatory Compliance & Privacy"
        purpose="Configure institutional privacy parameters, biometric data retention rules, and audit retention policies."
        statusSummary="Institutional compliance framework active with enforced biometric consent controls and data protection safeguards."
        why="Strict compliance posture ensures institutional adherence to digital data protection acts and higher education regulatory mandates."
        primaryAction={{ label: "Data Consent", href: "/sysadmin/consent" }}
        secondaryAction={{ label: "Audit Logs", href: "/sysadmin/audit" }}
      />
        <ComplianceSettings />
      </div>
    </AuthGuard>
  );
}
