"use client";

import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { CampusKnowledgeCentre } from "@/components/retention/CampusKnowledgeCentre";
import { CampusFeedbackDesk } from "@/components/retention/CampusFeedbackDesk";

// Relocated knowledge + feedback surfaces (moved off the home screen).
export default function KnowledgePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-3">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">
        Knowledge & Feedback
      </h1>
      <WidgetBoundary name="knowledge-centre">
        <CampusKnowledgeCentre />
      </WidgetBoundary>
      <WidgetBoundary name="feedback-desk">
        <CampusFeedbackDesk />
      </WidgetBoundary>
    </div>
  );
}
