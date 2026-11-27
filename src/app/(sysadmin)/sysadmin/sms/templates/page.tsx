"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";

import { SmsTemplates } from "@/components/admin/sms/SmsTemplates";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function SysadminSmsTemplatesPage() {
  return (
    <div className="space-y-5">
      <ContextSituationBar
        roleLabel="System Admin"
        purpose="Manage DLT-registered SMS template bodies and fill in DLT_TEMPLATE_IDs as they are approved."
        why="Template edits here apply to all future sends of that template type immediately."
        contextLabel="Manage DLT-registered SMS template bodies and fill in DLT_TEMPLATE_IDs as they are approved."
        statusSummary="Review current manage dlt-registered sms template bodies and fill in dlt_template_ids as they are approved. state and take action below."
        primaryAction={{ label: "SysAdmin Overview", href: "/sysadmin" }}
        secondaryAction={{ label: "System Health", href: "/sysadmin/health" }}
      />
      <PageHeader
        title="SMS Templates"
        subtitle="Manage DLT-registered SMS template bodies and fill in DLT_TEMPLATE_IDs as they are approved."
      />
      <Suspense fallback={<PageLoading />}>
        <WidgetBoundary title="Templates">
          <SmsTemplates />
        </WidgetBoundary>
      </Suspense>

    </div>
  );
}
