"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { MealReviewPanel } from "@/components/mess/MealReviewPanel";

export default function StudentMessReviewsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
      <PageHeader
        title="Meal Reviews"
        subtitle="Rate your meals."
      />
      <WidgetBoundary title="Meal Reviews">
        <MealReviewPanel />
      </WidgetBoundary>
    </div>
  );
}
