"use client";

import { useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { CampusKnowledgeCentre } from "@/components/retention/CampusKnowledgeCentre";
import { CampusFeedbackDesk } from "@/components/retention/CampusFeedbackDesk";
import { useIsSakuga } from "@/components/student/useIsSakuga";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

// Relocated knowledge + feedback surfaces (moved off the home screen).
export default function KnowledgePage() {
  const isSakuga = useIsSakuga();

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-3">
      <h1 className="text-lg font-semibold text-primary">
        Knowledge &amp; Feedback
      </h1>

      <ContextSituationBar
        roleLabel="Student"
        purpose="Search campus knowledge base, FAQs, policies, and submit institutional feedback"
        contextLabel="Knowledge & Feedback"
        statusSummary="Browse campus manuals, policy answers, and submit suggestions to the university feedback desk."
        why="Access verified administrative regulations regarding hostel curfews, exam rules, and campus facilities anytime."
        primaryAction={{ label: "Campus Feed", href: "/student/campus" }}
        secondaryAction={{ label: "Student Home", href: "/student" }}
      />

      {/* Sakuga-VFX glossary tooltip row — hover a term to see its definition */}
      {isSakuga && (
        <div className="surface-card bg-bg-surface p-3 text-xs space-y-2">
          <p className="font-semibold text-text-primary">Campus glossary</p>
          <div className="flex flex-wrap gap-2 text-text-secondary">
            <sakuga-tooltip text="Mess: the campus dining hall serving meals on tokens.">
              <span className="underline decoration-dotted cursor-help">mess</span>
            </sakuga-tooltip>
            <sakuga-tooltip text="Gate pass: a digital permit to enter/exit campus, scanned at security.">
              <span className="underline decoration-dotted cursor-help">gate pass</span>
            </sakuga-tooltip>
            <sakuga-tooltip text="OIE: Office of the Institution Executive — handles escalations and exceptions.">
              <span className="underline decoration-dotted cursor-help">OIE</span>
            </sakuga-tooltip>
            <sakuga-tooltip text="Anti-ragging: institutional policy + complaint flow for senior-junior incidents.">
              <span className="underline decoration-dotted cursor-help">anti-ragging</span>
            </sakuga-tooltip>
            <sakuga-tooltip text="SOS: emergency alert raised from the app, routed to security and guardians.">
              <span className="underline decoration-dotted cursor-help">SOS</span>
            </sakuga-tooltip>
          </div>
        </div>
      )}

      <WidgetBoundary name="knowledge-centre">
        <CampusKnowledgeCentre />
      </WidgetBoundary>
      <WidgetBoundary name="feedback-desk">
        <CampusFeedbackDesk />
      </WidgetBoundary>
    </div>
  );
}
