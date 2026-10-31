"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { MealReviewPanel } from "@/components/mess/MealReviewPanel";

export default function StudentMessReviewsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
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
