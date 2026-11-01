"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageLoading } from "@/components/admin/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { SmsComposer } from "@/components/admin/sms/SmsComposer";

export default function AdminSmsComposePage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Send SMS"
        subtitle="Compose and queue bulk SMS to campus segments or individual recipients."
      />
      <Suspense fallback={<PageLoading />}>
        <WidgetBoundary title="SMS Composer">
          <SmsComposer />
        </WidgetBoundary>
      </Suspense>
      <DevContactStrip />
    </div>
  );
}
