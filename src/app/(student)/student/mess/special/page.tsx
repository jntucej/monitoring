"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { SpecialItemSelector } from "@/components/mess/SpecialItemSelector";

export default function StudentMessSpecialPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader
        title="Special Items"
        subtitle="Pick the special items you want."
      />
      <WidgetBoundary title="Special Items">
        <SpecialItemSelector />
      </WidgetBoundary>
    </div>
  );
}
