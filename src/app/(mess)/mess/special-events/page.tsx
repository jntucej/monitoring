"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { SpecialEventManager } from "@/components/mess/SpecialEventManager";

export default function MessSpecialEventsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <PageHeader
        title="Special Events"
        subtitle="Announce special items, track interest, and get exact counts."
      />
      <SpecialEventManager />
    </div>
  );
}
