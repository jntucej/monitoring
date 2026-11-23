/**
 * nav/level0/StudentPageLoop — Level-0 (self/ward) student page-cluster pivot.
 *
 * Data-agnostic bar: caller passes a cluster key, we render the matching
 * list of "next-in-cluster" link chips. Each chip carries an ArrowUpRight
 * affordance. The wrapping bar sits alongside (or just under) the primary
 * SelfActionLoop in role pages, giving the user a quick "next pivot" row
 * scoped to the page family they're currently in (passes / mess / academics
 * / complaints / account).
 *
 * No page wiring here — the caller decides where to render the loop. The
 * caller owns any data (counts, active highlight, etc.); this bar is
 * purely a router surface.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsSakuga } from "@/components/student/useIsSakuga";

export type StudentPageCluster =
  | "passes"
  | "mess"
  | "academics"
  | "complaints"
  | "account";

/**
 * Hand-curated pivot set per cluster. Hrefs are real routes under
 * `src/app/(student)/student/`; only add or remove entries after
 * confirming the page file exists on the file system.
 */
const CLUSTER_PIVOTS: Record<
  StudentPageCluster,
  Array<{ label: string; href: string }>
> = {
  passes: [
    { label: "Gate Scan History", href: "/student/history" },
    { label: "Digital ID & QR", href: "/student/id" },
    { label: "New Request", href: "/student/permissions/new" },
  ],
  mess: [
    { label: "Rate Today's Meal", href: "/student/mess/reviews" },
    { label: "Special Items", href: "/student/mess/special" },
    { label: "Mess Bill", href: "/student/mess-bill" },
    { label: "Report Mess Issue", href: "/student/complaints" },
  ],
  academics: [
    { label: "Attendance Calendar", href: "/student/attendance-calendar" },
    { label: "Unified Calendar", href: "/student/calendar" },
    { label: "Marks & Exams", href: "/student/marks" },
  ],
  complaints: [
    { label: "Raise New Complaint", href: "/student/complaints" },
    { label: "Notifications & Alerts", href: "/student/notifications/alerts" },
  ],
  account: [
    { label: "Active Sessions", href: "/student/profile-security/sessions" },
    { label: "Privacy & Consent", href: "/student/profile/privacy" },
    { label: "Semester Recap", href: "/student/recap" },
  ],
};

export function StudentPageLoop({
  cluster,
  className,
}: {
  cluster: StudentPageCluster;
  className?: string;
}) {
  const router = useRouter();
  const isSakuga = useIsSakuga();
  const pivots = CLUSTER_PIVOTS[cluster];
  if (pivots.length === 0) return null;

  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        Next in {cluster}:
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {pivots.map((pivot) =>
          isSakuga ? (
            <sakuga-button
              key={pivot.href + pivot.label}
              variant="secondary"
              onClick={() => router.push(pivot.href)}
            >
              <span className="inline-flex items-center gap-1.5 text-xs">
                <span className="max-w-48 truncate">{pivot.label}</span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </span>
            </sakuga-button>
          ) : (
            <Link
              key={pivot.href + pivot.label}
              href={pivot.href}
              className="surface-card inline-flex items-center gap-1.5 bg-bg-elevated px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-surface hover:text-action-primary transition-colors motion-reduce:transition-none"
            >
              <span className="max-w-48 truncate">{pivot.label}</span>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden />
            </Link>
          ),
        )}
      </div>
    </div>
  );
}

export default StudentPageLoop;
