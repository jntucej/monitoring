"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";

import { SmsQueue } from "@/components/admin/sms/SmsQueue";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function AdminSmsQueuePage() {
  return (
    <div className="space-y-5">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Monitor queued, sent, delivered and failed SMS messages."
        why="Retry or cancel any queued message here before it is dispatched to the SMS gateway."
        contextLabel="Monitor queued, sent, delivered and failed SMS messages."
        statusSummary="Review current monitor queued, sent, delivered and failed sms messages. state and take action below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
        secondaryAction={{ label: "Campus Reports", href: "/admin/reports" }}
      />
      <PageHeader
        title="SMS Delivery"
        subtitle="Monitor queued, sent, delivered and failed SMS messages."
      />
      <Suspense fallback={<PageLoading />}>
        <WidgetBoundary title="SMS Queue">
          <SmsQueue />
        </WidgetBoundary>
      </Suspense>

    </div>
  );
}
