"use client";

import { Suspense, lazy } from "react";
import { PageHeader } from "@/components/admin/shared/PageHeader";

const MyEventsPage = lazy(() => import("@/components/shared/events/MyEventsPage"));

export default function StudentMyEventsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">My Events</h1>
        <p className="text-xs sm:text-sm text-text-muted mt-0.5">
          RSVP to campus events, check in at the venue, and track your event attendance.
        </p>
      </div>
      <Suspense fallback={null}>
        <MyEventsPage />
      </Suspense>
    </div>
  );
}
