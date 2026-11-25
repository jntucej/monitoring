"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { SpecialEventManager } from "@/components/mess/SpecialEventManager";

export default function MessSpecialEventsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <PageHeader
        title="Special Events"
        subtitle="Announce special items, track interest, and get exact counts."
      />
      <ContextSituationBar
        roleLabel="Mess In-Charge"
        purpose="Announce special feast items, survey student dining interest, and prepare feast procurement quantities"
        contextLabel="Special Dining Events & Feasts"
        statusSummary="Create and manage holiday dining events, track student token claims, and finalize feast meal counts."
        why="Planning special feast allocations in advance prevents severe kitchen shortfalls and verifies catering budget allowances."
        severity="info"
        primaryAction={{ label: "Verify Token", href: "/mess/verify-token" }}
        secondaryActions={[
          { label: "Menu Management", href: "/mess/menu-management" },
          { label: "Inventory Stock", href: "/mess/inventory-stock" },
          { label: "Mess Overview", href: "/mess" },
        ]}
      />
      <SpecialEventManager />
    </div>
  );
}
