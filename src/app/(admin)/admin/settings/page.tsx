"use client";

import { Settings } from "lucide-react";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { CollegeInfoForm } from "@/components/admin/CollegeInfoForm";
import { PassTypesForm } from "@/components/admin/PassTypesForm";

export default function AdminSettingsPage() {
  return (
    
      <div className="max-w-6xl mx-auto p-4 sm:p-4 sm:p-4 sm:p-6 space-y-4 sm:space-y-4 sm:space-y-6">
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

          <WidgetBoundary title="More Config">
            <div className="glass-card p-6 col-span-1 lg:col-span-2">
              <h3 className="font-semibold flex items-center gap-2 mb-4 text-emerald-400">
                <Settings className="w-5 h-5" />
                More dynamic config forms coming soon…
              </h3>
              <p className="text-sm text-[var(--text-muted)]">
                As part of settings modernization, exit reasons, roles, and UI
                configurations will map here.
              </p>
            </div>
          </WidgetBoundary>
        </div>
      </div>
    
    

  );
}
