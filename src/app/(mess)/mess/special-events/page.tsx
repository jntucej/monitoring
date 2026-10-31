"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { SpecialEventManager } from "@/components/mess/SpecialEventManager";

export default function MessSpecialEventsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader
        title="Special Events"
        subtitle="Announce special items, track interest, and get exact counts."
      />
      <SpecialEventManager />
    </div>
  );
}
