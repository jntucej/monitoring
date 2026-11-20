/**
 * (student)/student/passes/page.tsx — full PassHub orchestrator.
 *
 * v2: Replaced the old ActivePasses + PassCreateForm combo with the
 * persona-scoped PassHub, which drives everything from PassTypeConfig.
 */

"use client";

import { Suspense } from "react";
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

export default function StudentPassesPage() {
  const hasHydrated = useHasHydrated();
  if (!hasHydrated) return <PageLoading />;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 pb-12 select-none">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link
          href="/student"
          className="surface-card min-h11 inline-flex items-center justify-center p-2 text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          aria-label="Back to student hub"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-xs text-text-muted">Digital Gate Passes</p>
          <p className="text-xs text-text-muted">
            Persona-scoped · driven by {""}
            <code className="text-text-primary">PassTypeConfig</code>
          </p>
        </div>
      </div>

      {/* PassHub (active + curfew + quota + create + history toggle) */}
      <WidgetBoundary name="pass-hub">
        <Suspense fallback={<PageLoading />}>
          <PassHub />
        </Suspense>
      </WidgetBoundary>

      {/* PassHistory (period compare, rate, export) */}
      <WidgetBoundary name="pass-history">
        <Suspense fallback={<PageLoading />}>
          <PassHistory />
        </Suspense>
      </WidgetBoundary>

      {/* The document loop (S5): which passes need proof, their
          verified/pending/rejected status, re-upload. */}
      <WidgetBoundary name="my-documents">
        <Suspense fallback={<PageLoading />}>
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              My documents
            </h3>
            <MyDocuments />
          </div>
        </Suspense>
      </WidgetBoundary>
    </div>
  );
}
