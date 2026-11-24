"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  GraduationCap,
  UtensilsCrossed,
  Sparkles,
  QrCode,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  Flame,
  Plus,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { useIsSakuga } from "@/components/student/useIsSakuga";
import { CustomRoleGreeting } from "@/components/nav/CustomRoleGreeting";
import { AttendanceNextPeriodRadar } from "@/components/student/AttendanceNextPeriodRadar";
import {
  StudentPageLoop,
  type StudentPageCluster,
} from "@/components/nav/level0/StudentPageLoop";

export type StudentLens = "now" | "academics" | "living" | "growth";

export interface StudentLiveSnapshot {
  campusState: "INSIDE" | "OUTSIDE";
  activePass?: {
    id: string;
    ticketNumber: string;
    typeLabel: string;
    returnDeadline?: string | null;
    status: string;
  } | null;
  nextClass?: {
    subject: string;
    code: string;
    room: string;
    startsAt: string;
  } | null;
  attendancePct: number;
  safeSkipsRemaining: number;
  pendingAssignments: number;
  todayMealLabel?: string;
  unratedMealsCount: number;
  activeStreakDays: number;
  unreadAlerts: number;
}

const LENSES: Array<{
  id: StudentLens;
  label: string;
  cluster: StudentPageCluster;
  Icon: typeof Compass;
}> = [
  { id: "now", label: "Now", cluster: "passes", Icon: Compass },
  { id: "academics", label: "Academics", cluster: "academics", Icon: GraduationCap },
  { id: "living", label: "Hostel & Mess", cluster: "mess", Icon: UtensilsCrossed },
  { id: "growth", label: "Growth", cluster: "account", Icon: Sparkles },
];

export function StudentLivingHub({
  snapshot,
  onOpenQrModal,
}: {
  snapshot: StudentLiveSnapshot;
  onOpenQrModal?: (passId: string) => void;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const isSakuga = useIsSakuga();
  const [lens, setLens] = useState<StudentLens>("now");
  const [quickRated, setQuickRated] = useState<number | null>(null);

  const contextMode = useMemo(() => {
    if (snapshot.campusState === "OUTSIDE" || snapshot.activePass) {
      return "outing" as const;
    }
    const hour = new Date().getHours();
    if (hour >= 8 && hour < 17 && snapshot.nextClass) {
      return "classes" as const;
    }
    return "dining-evening" as const;
  }, [snapshot]);

  const activeLensDef = LENSES.find((l) => l.id === lens) ?? LENSES[0];

  const handleRateMeal = (star: number) => {
    setQuickRated(star);
    addToast({
      variant: "success",
      title: "Meal Rated",
      message: `Saved ${star}/5 rating for your last meal.`,
    });
  };

  const renderActionLink = (
    href: string,
    label: string,
    variant: "primary" | "secondary" = "secondary",
    icon?: React.ReactNode,
  ) => {
    if (isSakuga) {
      return (
        <sakuga-button variant={variant} onClick={() => router.push(href)}>
          <span className="inline-flex items-center gap-1.5 text-xs">
            {icon}
            <span>{label}</span>
          </span>
        </sakuga-button>
      );
    }
    return (
      <Link
        href={href}
        className={
          variant === "primary"
            ? "surface-card inline-flex items-center gap-1.5 bg-action-primary px-3.5 py-2 text-xs font-semibold text-white hover:opacity-95"
            : "surface-card inline-flex items-center gap-1 bg-bg-surface px-3 py-2 text-xs font-medium text-text-primary hover:bg-bg-elevated"
        }
      >
        {icon}
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <div className="space-y-4 pb-6">
      <CustomRoleGreeting
        name={user?.name}
        role={user?.role ?? "student"}
        pendingCount={snapshot.pendingAssignments + snapshot.unratedMealsCount}
        urgentCount={snapshot.unreadAlerts}
      />

      {/* Dynamic Context Hero */}
      <motion.section
        layout
        className="surface-card relative overflow-hidden bg-bg-surface p-4 sm:p-5"
      >
        {contextMode === "outing" && snapshot.activePass ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-action-success">
                  Active Pass • {snapshot.campusState}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-text-primary">
                {snapshot.activePass.typeLabel} ({snapshot.activePass.ticketNumber})
              </h2>
              {snapshot.activePass.returnDeadline && (
                <p className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                  <Clock className="h-3.5 w-3.5 text-action-warning" />
                  Return by {snapshot.activePass.returnDeadline}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isSakuga ? (
                <sakuga-button
                  variant="primary"
                  onClick={() =>
                    onOpenQrModal
                      ? onOpenQrModal(snapshot.activePass!.id)
                      : router.push(`/student/passes/${snapshot.activePass!.id}`)
                  }
                >
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <QrCode className="h-3.5 w-3.5" />
                    <span>Show Gate QR</span>
                  </span>
                </sakuga-button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    onOpenQrModal
                      ? onOpenQrModal(snapshot.activePass!.id)
                      : router.push(`/student/passes/${snapshot.activePass!.id}`)
                  }
                  className="surface-card inline-flex items-center gap-1.5 bg-action-primary px-3.5 py-2 text-xs font-semibold text-white hover:opacity-95"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>Show Gate QR</span>
                </button>
              )}
              {renderActionLink(
                `/student/passes/${snapshot.activePass.id}`,
                "Timeline",
                "secondary",
                <ArrowUpRight className="h-3.5 w-3.5" />,
              )}
            </div>
          </div>
        ) : contextMode === "classes" && snapshot.nextClass ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-action-primary">
                Up Next • {snapshot.nextClass.startsAt} • Room {snapshot.nextClass.room}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-text-primary">
                {snapshot.nextClass.subject}{" "}
                <span className="font-mono text-xs font-normal text-text-muted">
                  ({snapshot.nextClass.code})
                </span>
              </h2>
              <p className="text-xs text-text-muted">
                Overall Attendance:{" "}
                <span className="font-semibold text-text-primary">
                  {snapshot.attendancePct}%
                </span>{" "}
                (
                {snapshot.safeSkipsRemaining > 0
                  ? `${snapshot.safeSkipsRemaining} safe skips available`
                  : "Attend next classes to protect 75% threshold"}
                )
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {renderActionLink(
                "/student/attendance-calendar",
                "Attendance Radar",
                "primary",
                <ArrowUpRight className="h-3.5 w-3.5" />,
              )}
              {renderActionLink(
                "/student/permissions/new",
                "Request Pass",
                "secondary",
                <Plus className="h-3.5 w-3.5" />,
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-action-primary">
                Campus Status • {snapshot.campusState}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-text-primary">
                {snapshot.todayMealLabel ?? "Evening Check-In & Tomorrow's Prep"}
              </h2>
              <p className="text-xs text-text-muted">
                {snapshot.pendingAssignments} pending assignment
                {snapshot.pendingAssignments === 1 ? "" : "s"} •{" "}
                {snapshot.activeStreakDays}-day campus streak
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {renderActionLink(
                "/student/permissions/new",
                "New Gate Pass",
                "primary",
                <Plus className="h-3.5 w-3.5" />,
              )}
              {renderActionLink(
                "/student/id",
                "Digital ID",
                "secondary",
                <QrCode className="h-3.5 w-3.5" />,
              )}
            </div>
          </div>
        )}
      </motion.section>

      {/* Interactive 4-Lens Switcher */}
      {isSakuga ? (
        <sakuga-tabs
          activeTab={lens}
          onTabChange={(e: CustomEvent<{ id?: string }>) => {
            const next = e.detail?.id as StudentLens | undefined;
            if (next) setLens(next);
          }}
        >
          {LENSES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              data-tab={id}
              onClick={() => setLens(id)}
              className="px-3 py-1.5 text-xs font-semibold"
            >
              {label}
            </button>
          ))}
        </sakuga-tabs>
      ) : (
        <div
          role="tablist"
          aria-label="Student dashboard lenses"
          className="surface-card grid grid-cols-4 gap-1.5 bg-bg-elevated/60 p-1"
        >
          {LENSES.map(({ id, label, Icon }) => {
            const active = lens === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setLens(id)}
                className={`relative flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-semibold transition-colors ${
                  active
                    ? "text-white"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="student-lens-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-xl bg-action-primary"
                  />
                )}
                <Icon className="relative z-10 h-3.5 w-3.5 shrink-0" />
                <span className="relative z-10 truncate">{label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Lens Content Stage */}
      <AnimatePresence mode="wait">
        <motion.div
          key={lens}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16 }}
          className="space-y-3"
        >
          {lens === "now" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="surface-card bg-bg-surface p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Movement & Gate Passes
                </p>
                <p className="text-sm font-medium text-text-primary">
                  Apply for outing/home leave, extend active passes, or upload proof documents.
                </p>
                <div className="pt-1 flex flex-wrap gap-2">
                  {renderActionLink("/student/passes", "Open Pass Hub →", "primary")}
                  {renderActionLink("/student/history", "Scan Log →", "secondary")}
                </div>
              </div>

              <div className="surface-card bg-bg-surface p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Quick Issue & Hierarchy Escalation
                </p>
                <p className="text-sm font-medium text-text-primary">
                  Direct a hostel, lab, or mess complaint straight to the responsible role or person.
                </p>
                <div className="pt-1 flex flex-wrap gap-2">
                  {renderActionLink("/student/complaints/new", "Raise Complaint →", "primary")}
                  {renderActionLink("/student/complaints", "Track Status →", "secondary")}
                </div>
              </div>
            </div>
          )}

          {lens === "academics" && (
            <div className="space-y-3">
              <AttendanceNextPeriodRadar
                overallAttended={Math.round(snapshot.attendancePct)}
                overallTotal={100}
                upcomingPeriods={
                  snapshot.nextClass
                    ? [
                        {
                          id: "next-1",
                          periodNumber: 1,
                          subjectCode: snapshot.nextClass.code,
                          subjectName: snapshot.nextClass.subject,
                          roomNumber: snapshot.nextClass.room,
                          startTime: snapshot.nextClass.startsAt,
                          endTime: "",
                          status: "scheduled",
                        },
                      ]
                    : []
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="surface-card bg-bg-surface p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Attendance Standing
                  </span>
                  <span className="surface-card font-mono text-xs font-bold text-action-primary bg-action-primary/15 px-2 py-0.5">
                    {snapshot.attendancePct}%
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  {snapshot.safeSkipsRemaining > 0
                    ? `You can miss ${snapshot.safeSkipsRemaining} more period(s) and stay above 75%.`
                    : "You are at or below the 75% threshold—attend upcoming sessions."}
                </p>
                <div className="pt-1">
                  {renderActionLink("/student/attendance", "Subject Breakdown & Calendar →", "primary")}
                </div>
              </div>

              <div className="surface-card bg-bg-surface p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Assignments & Exams
                  </span>
                  <span className="font-mono text-xs font-semibold text-text-primary">
                    {snapshot.pendingAssignments} open
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  Confirm submissions, check exam clearances, and review semester marks.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {renderActionLink("/student/assignments", "Assignments →", "primary")}
                  {renderActionLink("/student/exams", "Exams & Marks →", "secondary")}
                </div>
              </div>
            </div>
            </div>
          )}

          {lens === "living" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="surface-card bg-bg-surface p-4 space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Instant Meal Pulse
                </p>
                <p className="text-xs text-text-muted">
                  Tap a quick score for your last meal or open full mess controls & bill opt-outs:
                </p>
                {isSakuga ? (
                  <div className="flex items-center gap-2">
                    <sakuga-rating
                      value={String(quickRated ?? 0)}
                      onChange={(e: CustomEvent<{ value?: number }>) => {
                        const v = Number(e.detail?.value ?? 5);
                        handleRateMeal(v);
                      }}
                    />
                    {quickRated && (
                      <span className="inline-flex items-center gap-1 text-xs text-action-success">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleRateMeal(star)}
                        className={`h-8 w-8 rounded-lg border text-xs font-bold transition ${
                          quickRated === star
                            ? "border-action-primary bg-action-primary text-white"
                            : "border-border bg-bg-elevated text-text-primary hover:bg-bg-surface"
                        }`}
                      >
                        {star}★
                      </button>
                    ))}
                    {quickRated && (
                      <span className="inline-flex items-center gap-1 text-xs text-action-success ml-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                      </span>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {renderActionLink("/student/mess", "Mess Hub →", "primary")}
                  {renderActionLink("/student/mess-bill", "Bill & Opt-Out →", "secondary")}
                </div>
              </div>

              <div className="surface-card bg-bg-surface p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Special Event Tokens & Dining
                </p>
                <p className="text-xs text-text-muted">
                  Claim special-item tokens and view your meal consumption history.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {renderActionLink("/student/mess/special", "Special Items →", "primary")}
                  {renderActionLink("/student/mess/token", "Event Tokens →", "secondary")}
                </div>
              </div>
            </div>
          )}

          {lens === "growth" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="surface-card bg-bg-surface p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Streaks & Milestones
                  </span>
                  <span className="surface-card inline-flex items-center gap-1 bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-action-warning">
                    <Flame className="h-3.5 w-3.5" /> {snapshot.activeStreakDays}d
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  Track personal goals, earned badges, and your shareable semester recap.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {renderActionLink("/student/achievements", "Achievements →", "primary")}
                  {renderActionLink("/student/recap", "Semester Recap →", "secondary")}
                </div>
              </div>

              <div className="surface-card bg-bg-surface p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Campus Events & Communities
                </p>
                <p className="text-xs text-text-muted">
                  Explore campus clubs, RSVP to workshops/hackathons, and browse the knowledge base.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {renderActionLink("/student/campus", "Campus Feed →", "primary")}
                  {renderActionLink("/student/knowledge", "Knowledge Hub →", "secondary")}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <StudentPageLoop cluster={activeLensDef.cluster} />
    </div>
  );
}
