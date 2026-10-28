"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { SpecialItemSelector } from "@/components/mess/SpecialItemSelector";

export default function StudentMessSpecialPage() {
  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
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
