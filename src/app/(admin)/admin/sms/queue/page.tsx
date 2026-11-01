"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageLoading } from "@/components/admin/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { SmsQueue } from "@/components/admin/sms/SmsQueue";

export default function AdminSmsQueuePage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="SMS Delivery"
        subtitle="Monitor queued, sent, delivered and failed SMS messages."
      />
      <Suspense fallback={<PageLoading />}>
        <WidgetBoundary title="SMS Queue">
          <SmsQueue />
        </WidgetBoundary>
      </Suspense>
      <DevContactStrip />
    </div>
  );
}
