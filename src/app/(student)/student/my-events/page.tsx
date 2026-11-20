"use client";

import { Suspense, lazy } from "react";
import { PageHeader } from "@/components/admin/shared/PageHeader";

const MyEventsPage = lazy(() => import("@/components/shared/events/MyEventsPage"));

export default function StudentMyEventsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-4 p-4 sm:p-6">
      <PageHeader
        title="My Events"
        subtitle="RSVP, check in, track, and dispute — your full event loop"
      />
      <Suspense fallback={null}>
        <MyEventsPage />
      </Suspense>
    </div>
  );
}
