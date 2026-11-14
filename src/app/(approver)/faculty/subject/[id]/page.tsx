"use client";

/**
 * Subject Faculty console — subject-scoped class drilldown.
 *
 * `[id]` is the class_id. Fetches GET /api/faculty/my-class/[id]
 * (ClassOverview: class row + roster + today's counts).
 *
 *   - 403 FORBIDDEN (caller not assigned to this class) → EmptyState
 *     "Not assigned to this class"
 *   - otherwise                                          → roster cards +
 *     today's attendance for the caller's subject
 *
 * The context panel entity is "student": selecting a roster row surfaces the
 * subject-scoped history for that student. No horizontal scroll — roster
 * renders as cards on mobile. Subject faculty has no approval rights.
 */

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";

import { ClassRoster } from "@/components/faculty/ClassRoster";
import { StudentContextPanel } from "@/components/faculty/StudentContextPanel";

function SubjectClassDrilldownInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = params?.id ?? "";
  const subject = searchParams.get("subject");

  // 1.12 — selection is owned by the page (not the shell), so opening the
  // context panel no longer re-mounts the RoleConsole.
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  return (
    <AuthGuard allowedRoles={["faculty", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <div className="grid min-w-0 md:grid-cols-[1fr_360px]">
          <div className="flex flex-col min-w-0">
            <div className="px-4 pt-4">
              <button
                type="button"
                onClick={() => router.replace("/faculty/subject", { scroll: false })}
                className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                <ArrowRight className="size-3.5 rotate-180" /> Back to subject picker
              </button>
            </div>
            <ClassRoster
              classId={classId}
              subject={subject}
              onSelect={setSelectedStudentId}
            />
          </div>
          {selectedStudentId && (
            <StudentContextPanel
              key={selectedStudentId}
              studentId={selectedStudentId}
              classId={classId}
              onClose={() => setSelectedStudentId(null)}
            />
          )}
        </div>
      </Suspense>
    </AuthGuard>
  );
}

export default function SubjectClassDrilldownPage() {
  return <SubjectClassDrilldownInner />;
}
