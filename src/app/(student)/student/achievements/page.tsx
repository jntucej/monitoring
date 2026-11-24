"use client";

import { Suspense, lazy } from "react";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Achievements } from "@/components/engagement/Achievements";
import { PersonalGoals } from "@/components/engagement/PersonalGoals";
import { ContributionPortfolio } from "@/components/retention/ContributionPortfolio";

const AchievementsReviewPanel = lazy(
  () => import("@/components/engagement/AchievementsReviewPanel")
);

// Relocated progress widgets (moved off the home screen).
export default function AchievementsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-3">
      <h1 className="text-lg font-semibold text-primary">
        Achievements & Goals
      </h1>
      <ContextSituationBar
        roleLabel="Student"
        purpose="Review your academic milestones, badges, personal goals, and campus contributions"
        contextLabel="Achievements & Milestones"
        statusSummary="Track your personal development progress, milestone badges, and semester contributions."
        primaryAction={{ label: "Semester Recap", href: "/student/recap" }}
        secondaryAction={{ label: "Student Home", href: "/student" }}
      />
      <WidgetBoundary name="achievements">
        <Achievements />
      </WidgetBoundary>
      <Suspense fallback={null}>
        <AchievementsReviewPanel />
      </Suspense>
      <WidgetBoundary name="personal-goals">
        <PersonalGoals />
      </WidgetBoundary>
      <WidgetBoundary name="contribution-portfolio">
        <ContributionPortfolio />
      </WidgetBoundary>
    </div>
  );
}
