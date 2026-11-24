"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { MealReviewPanel } from "@/components/mess/MealReviewPanel";
import { useIsSakuga } from "@/components/student/useIsSakuga";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function StudentMessReviewsPage() {
  const isSakuga = useIsSakuga();
  const [quickMood, setQuickMood] = useState(0);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <PageHeader
        title="Meal Reviews"
        subtitle="Rate your meals."
      />
      <ContextSituationBar
        roleLabel="Student"
        purpose="Submit ratings and quality feedback on breakfast, lunch, snacks, and dinner servings"
        contextLabel="Dining Quality & Feedback"
        statusSummary="Help mess managers improve food quality by rating today's dishes and service."
        primaryAction={{ label: "Meal Token", href: "/student/mess/token" }}
        secondaryAction={{ label: "Mess Bill", href: "/student/mess-bill" }}
      />
      {isSakuga && (
        <div className="surface-card bg-bg-surface p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-text-primary">Quick mood check</p>
            <p className="text-xs text-text-muted">How did today&apos;s meals feel? (full reviews below)</p>
          </div>
          <sakuga-rating
            value={quickMood}
            label="quick meal mood"
            onChange={((e: unknown) => setQuickMood((e as any).target?.value ? +(e as any).target.value : 0)) as any}
          >
            ★
          </sakuga-rating>
        </div>
      )}
      <WidgetBoundary title="Meal Reviews">
        <MealReviewPanel />
      </WidgetBoundary>
    </div>
  );
}
