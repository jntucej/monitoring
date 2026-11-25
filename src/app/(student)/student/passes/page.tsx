/**
 * (student)/student/passes/page.tsx — full PassHub orchestrator.
 *
 * v2: Replaced the old ActivePasses + PassCreateForm combo with the
 * persona-scoped PassHub, which drives everything from PassTypeConfig.
 */

"use client";

import { Suspense, useState } from "react";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { useHasHydrated } from "@/stores/authStore";
import { usePersona } from "@/hooks/usePersona";
import { PassHub } from "@/components/shared/pass/PassHub";
import { PassHistory } from "@/components/shared/pass/PassHistory";
import { ExtendPassModal } from "@/components/shared/pass/ExtendPassModal";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { MyDocuments } from "@/components/shared/documents/MyDocuments";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { SelfActionLoop, type NextActionStep } from "@/components/nav/level0/SelfActionLoop";
import { FileText } from "lucide-react";

export default function StudentPassesPage() {
  const hasHydrated = useHasHydrated();
  // Level-0 record pivot: the pass/ticket currently in focus. Set by
  // clicking an active pass row (Full Timeline step routes by ticket id).
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  if (!hasHydrated) return <PageLoading />;

  const selectedSteps: NextActionStep[] = selectedTicket
    ? [
        { label: "Full Timeline", href: `/student/passes/${encodeURIComponent(selectedTicket)}` },
        { label: "Proof Status", href: "#documents", badge: "docs" },
        { label: "Gate Scans", href: "/student/activity" },
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 pb-12 select-none">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link
          href="/student"
          className="surface-card min-h-11 inline-flex items-center justify-center p-2 text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          aria-label="Back to student hub"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-text-primary">My Gate Passes</h1>
          <p className="text-xs sm:text-sm text-text-muted">
            Active QR passes for campus entry and exit, plus your pass history and supporting documents.
          </p>
        </div>
      </div>

      {/* Context & next step */}
      <ContextSituationBar
        roleLabel="Student"
        purpose="View, verify, and present campus entry and exit QR passes"
        contextLabel="Gate Passes vs. Requests"
        statusSummary="Approved requests become active QR gate passes here. Need a new outing or leave? Submit a request first."
        why="Select any active pass below to inspect its full timeline, proof status, and gate scan history."
        primaryAction={{ label: "New Request", href: "/student/permissions/new" }}
        secondaryAction={{ label: "My Requests", href: "/student/permissions" }}
      />

      {/* PassHub (active + curfew + quota + create + history toggle) */}
      <WidgetBoundary name="pass-hub">
        <Suspense fallback={<PageLoading />}>
          <div className="space-y-1.5">
            <p className="text-[11px] text-text-muted">
              Active QR passes ready for gate scanning, plus quick pass creation and period usage.
            </p>
            <PassHub onSelectPass={setSelectedTicket} />
          </div>
        </Suspense>
      </WidgetBoundary>

      {/* PassHistory (period compare, rate, export) */}
      <WidgetBoundary name="pass-history">
        <Suspense fallback={<PageLoading />}>
          <div className="space-y-1.5">
            <p className="text-[11px] text-text-muted">
              Historical pass log — filter by period to compare usage and review completed or expired passes.
            </p>
            <PassHistory />
          </div>
        </Suspense>
      </WidgetBoundary>

      {/* The document loop (S5): which passes need proof, their
          verified/pending/rejected status, re-upload. */}
      <WidgetBoundary name="my-documents">
        <Suspense fallback={<PageLoading />}>
          <div id="documents" className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  My documents
                </h3>
                <p className="text-[11px] text-text-muted">
                  Supporting proof (medical notes, IDs) linked to your passes and their verification status.
                </p>
              </div>
              <Link
                href="/student/permissions"
                className="inline-flex items-center gap-1.5 rounded-lg bg-bg-elevated px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:text-action-primary transition-colors motion-reduce:transition-none"
              >
                <FileText className="h-3.5 w-3.5" />
                View My Requests
              </Link>
            </div>
            <MyDocuments />
          </div>
        </Suspense>
      </WidgetBoundary>

      {/* Level-0 record pivot: when a pass/ticket is in focus, surface its
          next-step actions (Full Timeline / Proof Status / Gate Scans). */}
      {selectedTicket && (
        <SelfActionLoop
          title={`Pass ${selectedTicket}`}
          meta="Selected pass — where to take it next"
          steps={selectedSteps}
        />
      )}
    </div>
  );
}
