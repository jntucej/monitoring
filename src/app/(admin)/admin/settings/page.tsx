"use client";

import { Settings, Eye } from "lucide-react";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { CollegeInfoForm } from "@/components/admin/CollegeInfoForm";
import { PassTypesForm } from "@/components/admin/PassTypesForm";
import { PreviewAsPanel } from "@/components/shared/PreviewAsPanel";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function AdminSettingsPage() {
  return (
    
      <div className="max-w-6xl mx-auto p-4 sm:p-4 sm:p-4 sm:p-6 space-y-4 sm:space-y-4 sm:space-y-6">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Configure dynamic system preferences and institutional records"
        why="Most settings here affect backend workers and gate scanners, not just the web UI."
        contextLabel="Configure dynamic system preferences and institutional records"
        statusSummary="Review current configure dynamic system preferences and institutional records state and take action below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
        secondaryAction={{ label: "Campus Reports", href: "/admin/reports" }}
      />
        <PageHeader
          title="Settings"
          subtitle="Configure dynamic system preferences and institutional records"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WidgetBoundary title="College Information">
            <CollegeInfoForm />
          </WidgetBoundary>

          <WidgetBoundary title="Pass Types">
            <PassTypesForm />
          </WidgetBoundary>

          <WidgetBoundary title="Preview as Segment">
            <PreviewAsPanel />
          </WidgetBoundary>

          <WidgetBoundary title="Configuration Directory">
            <div className="surface-card p-6 col-span-1 lg:col-span-2 space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-emerald-400">
                <Settings className="w-5 h-5" />
                Institutional &amp; System Configuration
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { label: "Institutional Config", href: "/admin/institutional-configuration", desc: "Campus rules, timings & policies" },
                  { label: "Permission Policies", href: "/admin/permission-policies", desc: "Pass & leave approval rules" },
                  { label: "Workflow Config", href: "/admin/workflow-configuration", desc: "Escalation & routing stages" },
                  { label: "Roles & Access", href: "/admin/roles", desc: "Role definitions & permissions" },
                  { label: "Gate Devices", href: "/admin/gate-device-configuration", desc: "RFID readers & gate hardware" },
                  { label: "Notifications", href: "/admin/notification-settings", desc: "Alert channels & templates" },
                ].map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="block rounded-lg border border-border bg-bg-elevated p-3 hover:border-border-strong transition-colors"
                  >
                    <div className="text-sm font-medium text-text-primary">{item.label}</div>
                    <div className="text-xs text-text-muted mt-0.5">{item.desc}</div>
                  </a>
                ))}
              </div>
            </div>
          </WidgetBoundary>
        </div>
      </div>
    
    

  );
}
