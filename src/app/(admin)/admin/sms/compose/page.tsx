"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageLoading } from "@/components/admin/shared/LoadingStates";

import { SmsComposer } from "@/components/admin/sms/SmsComposer";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function AdminSmsComposePage() {
  return (
    <div className="space-y-5">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Compose and queue bulk SMS to campus segments or individual recipients."
        contextLabel="Compose and queue bulk SMS to campus segments or individual recipients."
        statusSummary="Review current compose and queue bulk sms to campus segments or individual recipients. state and take action below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
        secondaryAction={{ label: "Campus Reports", href: "/admin/reports" }}
      />
      <PageHeader
        title="Send SMS"
        subtitle="Compose and queue bulk SMS to campus segments or individual recipients."
      />
      <Suspense fallback={<PageLoading />}>
        <WidgetBoundary title="SMS Composer">
          <SmsComposer />
        </WidgetBoundary>
      </Suspense>

    </div>
  );
}
