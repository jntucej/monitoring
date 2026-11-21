"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { SpecialItemSelector } from "@/components/mess/SpecialItemSelector";
import { useIsSakuga } from "@/components/student/useIsSakuga";

export default function StudentMessSpecialPage() {
  const isSakuga = useIsSakuga();
  const [dietPref, setDietPref] = useState<string>("");

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <PageHeader
        title="Special Items"
        subtitle="Pick the special items you want."
      />
      {isSakuga && (
        <div className="surface-card bg-bg-surface p-4">
          <p className="text-sm font-semibold text-text-primary mb-2">Dietary preference</p>
          <div className="flex flex-wrap gap-3">
            <sakuga-radio name="diet" value="veg" checked={dietPref === "veg"} label="veg"
              onChange={(e: Event) => setDietPref((e.target as unknown as { value: string }).value)}>
              Vegetarian
            </sakuga-radio>
            <sakuga-radio name="diet" value="non-veg" checked={dietPref === "non-veg"} label="non-veg"
              onChange={(e: Event) => setDietPref((e.target as unknown as { value: string }).value)}>
              Non-veg
            </sakuga-radio>
            <sakuga-radio name="diet" value="sweet" checked={dietPref === "sweet"} label="sweet"
              onChange={(e: Event) => setDietPref((e.target as unknown as { value: string }).value)}>
              Sweet
            </sakuga-radio>
          </div>
          <p className="text-xs text-text-muted mt-2">
            {dietPref ? `Preferring ${dietPref}` : "Pick one to filter the special items below."}
          </p>
        </div>
      )}
      <WidgetBoundary title="Special Items">
        <SpecialItemSelector />
      </WidgetBoundary>
    </div>
  );
}
