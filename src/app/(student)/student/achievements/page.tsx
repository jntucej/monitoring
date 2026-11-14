"use client";

import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Achievements } from "@/components/engagement/Achievements";
import { PersonalGoals } from "@/components/engagement/PersonalGoals";
import { ContributionPortfolio } from "@/components/retention/ContributionPortfolio";

// Relocated progress widgets (moved off the home screen).
export default function AchievementsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-3">
      <h1 className="text-lg font-semibold text-primary">
        Achievements & Goals
      </h1>
      <WidgetBoundary name="achievements">
        <Achievements />
      </WidgetBoundary>
      <WidgetBoundary name="personal-goals">
        <PersonalGoals />
      </WidgetBoundary>
      <WidgetBoundary name="contribution-portfolio">
        <ContributionPortfolio />
      </WidgetBoundary>
    </div>
  );
}
