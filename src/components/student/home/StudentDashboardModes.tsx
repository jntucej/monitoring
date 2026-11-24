"use client";

import Link from "next/link";
import { Compass, GraduationCap, Home, Sparkles, ArrowRight } from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { MyStatsCard } from "@/components/student/home/MyStatsCard";
import { MyDayStrip } from "@/components/student/home/MyDayStrip";
import { ActivePassCard } from "@/components/student/home/ActivePassCard";
import { ContextCard } from "@/components/student/home/ContextCard";
import { MessFoodPreference } from "@/components/student/MessFoodPreference";
import { ThemePicker } from "@/components/student/ThemePicker";
import { AntiRaggingProgress } from "@/components/student/AntiRaggingProgress";
import { TodayStatus } from "@/components/student/home/TodayStatus";
import { ActionItemsStrip } from "@/components/student/home/ActionItemsStrip";
import { useIsSakuga } from "@/components/student/useIsSakuga";

export type StudentDashboardMode = "today" | "academics" | "hostel" | "growth";

export const STUDENT_DASHBOARD_MODES: Array<{
  id: StudentDashboardMode;
  label: string;
  subtitle: string;
  icon: typeof Compass;
}> = [
  { id: "today", label: "Today", subtitle: "Gate status & today's schedule", icon: Compass },
  { id: "academics", label: "Academics", subtitle: "Attendance, classes & marks", icon: GraduationCap },
  { id: "hostel", label: "Hostel & Mess", subtitle: "Curfew, meal tokens & issues", icon: Home },
  { id: "growth", label: "Growth", subtitle: "Monthly recap, goals & theme", icon: Sparkles },
];

export function StudentModeSwitcher({
  mode,
  onChange,
}: {
  mode: StudentDashboardMode;
  onChange: (next: StudentDashboardMode) => void;
}) {
  const isSakuga = useIsSakuga();

  if (isSakuga) {
    return (
      <div data-testid="student-mode-switcher" className="surface-card p-2.5">
        <sakuga-tabs
          activeTab={mode}
          onChange={((e: unknown) => {
            const v = (e as { target?: { getAttribute?: (k: string) => string | null } }).target?.getAttribute?.("value");
            if (v === "today" || v === "academics" || v === "hostel" || v === "growth") {
              onChange(v);
            }
          }) as unknown}
        >
          {STUDENT_DASHBOARD_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              value={m.id}
              onClick={() => onChange(m.id)}
              data-testid={`student-mode-${m.id}`}
              className="text-xs font-semibold px-2 py-1"
            >
              {m.label}
            </button>
          ))}
        </sakuga-tabs>
      </div>
    );
  }

  return (
    <nav
      aria-label="Student dashboard modes"
      data-testid="student-mode-switcher"
      className="grid grid-cols-2 sm:grid-cols-4 gap-2"
    >
      {STUDENT_DASHBOARD_MODES.map((m) => {
        const Icon = m.icon;
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            aria-pressed={active}
            data-testid={`student-mode-${m.id}`}
            className={`surface-card p-2.5 text-left transition-colors flex items-start gap-2 ${
              active
                ? "border-action-primary bg-action-primary/10 text-action-primary"
                : "bg-bg-surface text-text-secondary hover:bg-bg-elevated"
            }`}
          >
            <Icon className="size-4 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{m.label}</p>
              <p className="text-[10px] opacity-80 truncate">{m.subtitle}</p>
            </div>
          </button>
        );
      })}
    </nav>
  );
}

function QuickActionGrid({
  links,
}: {
  links: Array<{ href: string; title: string; desc: string }>;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="surface-card bg-bg-surface p-3 hover:bg-bg-elevated transition-colors flex items-center justify-between gap-2"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-primary truncate">{l.title}</p>
            <p className="text-[11px] text-text-muted truncate">{l.desc}</p>
          </div>
          <ArrowRight className="size-3.5 text-action-primary shrink-0" />
        </Link>
      ))}
    </div>
  );
}

export function StudentModeBody({
  mode,
  resetKey,
}: {
  mode: Exclude<StudentDashboardMode, "today">;
  resetKey: number;
}) {
  if (mode === "academics") {
    return (
      <div className="space-y-3" data-testid="student-mode-academics-body">
        <WidgetBoundary name="academics-stats" resetKey={resetKey}>
          <MyStatsCard />
        </WidgetBoundary>
        <WidgetBoundary name="academics-actions" resetKey={resetKey}>
          <ActionItemsStrip />
        </WidgetBoundary>
        <WidgetBoundary name="academics-day" resetKey={resetKey}>
          <MyDayStrip />
        </WidgetBoundary>
        <QuickActionGrid
          links={[
            { href: "/student/attendance", title: "Subject Attendance", desc: "Check subject-wise standing" },
            { href: "/student/attendance-calendar", title: "Attendance Calendar", desc: "Day-by-day presence log" },
            { href: "/student/assignments", title: "Assignments", desc: "Pending submissions & deadlines" },
            { href: "/student/marks", title: "Marks & Exams", desc: "Internal marks & exam schedule" },
          ]}
        />
      </div>
    );
  }

  if (mode === "hostel") {
    return (
      <div className="space-y-3" data-testid="student-mode-hostel-body">
        <WidgetBoundary name="hostel-status" resetKey={resetKey}>
          <TodayStatus />
        </WidgetBoundary>
        <WidgetBoundary name="hostel-pass" resetKey={resetKey}>
          <ActivePassCard />
        </WidgetBoundary>
        <WidgetBoundary name="hostel-context" resetKey={resetKey}>
          <ContextCard />
        </WidgetBoundary>
        <WidgetBoundary name="hostel-mess-pref" resetKey={resetKey}>
          <MessFoodPreference />
        </WidgetBoundary>
        <QuickActionGrid
          links={[
            { href: "/student/mess", title: "Today's Mess & Meals", desc: "Menu, meal rating & tokens" },
            { href: "/student/mess-bill", title: "Mess Bill & Opt-Out", desc: "Monthly charges & meal opt-out" },
            { href: "/student/complaints", title: "Hostel & Facility Issues", desc: "Raise or track complaints" },
            { href: "/student/passes", title: "Leave & Outing Passes", desc: "Request or extend a pass" },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="student-mode-growth-body">
      <WidgetBoundary name="growth-theme" resetKey={resetKey}>
        <ThemePicker />
      </WidgetBoundary>
      <WidgetBoundary name="growth-antiragging" resetKey={resetKey}>
        <AntiRaggingProgress />
      </WidgetBoundary>
      <QuickActionGrid
        links={[
          { href: "/student/achievements", title: "Achievements & Badges", desc: "Milestones & campus contributions" },
          { href: "/student/recap", title: "Semester Recap", desc: "Your semester highlights & stats" },
          { href: "/student/calendar", title: "Campus Calendar", desc: "Upcoming events & holidays" },
          { href: "/student/profile", title: "Profile & Occasional Settings", desc: "Privacy, mess & session controls" },
        ]}
      />
    </div>
  );
}
