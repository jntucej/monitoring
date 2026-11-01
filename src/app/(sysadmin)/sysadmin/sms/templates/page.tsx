"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageLoading } from "@/components/admin/shared/LoadingStates";

import { SmsTemplates } from "@/components/admin/sms/SmsTemplates";

export default function SysadminSmsTemplatesPage() {
  return (
    <div className="space-y-5">
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
