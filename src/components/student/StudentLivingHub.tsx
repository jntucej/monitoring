"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  QrCode,
  Clock,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import { useIsSakuga } from "@/components/student/useIsSakuga";

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

export type StudentLens = "now" | "academics" | "living" | "growth";

export function StudentLivingHub({
  snapshot,
  onOpenQrModal,
  persona = "day_scholar",
}: {
  snapshot: StudentLiveSnapshot;
  onOpenQrModal?: (passId: string) => void;
  /** day_scholar | hosteller — gates hostel-specific chrome (curfew/mess). */
  persona?: "day_scholar" | "hosteller";
}) {
  const router = useRouter();
  const isSakuga = useIsSakuga();

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

  const isHosteller = persona === "hosteller";

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
      {/* Dynamic Context Hero — presence + persona aware.
          OUTSIDE (or active pass)  → pass QR + return deadline FIRST.
          INSIDE + class window     → next class + attendance.
          INSIDE + evening (hostel) → meal / check-in (hostel chrome only for hostellers). */}
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
                  Active Pass · {snapshot.campusState === "OUTSIDE" ? "Out of Campus" : "On Campus"}
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
                Up Next · {snapshot.nextClass.startsAt} · Room {snapshot.nextClass.room}
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
                Campus Status · {snapshot.campusState === "OUTSIDE" ? "Out of Campus" : "On Campus"}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-text-primary">
                {isHosteller && snapshot.todayMealLabel
                  ? snapshot.todayMealLabel
                  : "On Campus · Today's Prep"}
              </h2>
              <p className="text-xs text-text-muted">
                {snapshot.pendingAssignments} pending assignment
                {snapshot.pendingAssignments === 1 ? "" : "s"}
                {isHosteller &&
                  ` · ${snapshot.activeStreakDays}-day campus streak`}
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
    </div>
  );
}
