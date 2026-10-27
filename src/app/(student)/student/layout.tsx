"use client";

import { Suspense } from "react";
import { DoorOpen, ClipboardList, GraduationCap, BookOpen, User } from "lucide-react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

export default function StudentConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["student"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <div className="min-w-0">
          <RoleConsole
            role="student"
            roleRoot="/student"
            groups={[
              {
                id: "passes",
                label: "Passes",
                icon: DoorOpen,
                children: [
                  { label: "My Passes", href: "/student/passes" },
                  { label: "Apply for Pass", href: "/student/pass-application" },
                  { label: "Leave Requests", href: "/student/leave-requests" },
                ],
              },
              {
                id: "permissions",
                label: "Permissions",
                icon: ClipboardList,
                children: [
                  { label: "My Permissions", href: "/student/permissions" },
                  { label: "New Permission", href: "/student/permissions/new" },
                  { label: "Request Tracking", href: "/student/request-tracking" },
                ],
              },
              {
                id: "movement",
                label: "Movement",
                icon: GraduationCap,
                children: [
                  { label: "Gate Pass", href: "/student/gate-pass" },
                  { label: "History", href: "/student/history" },
                  { label: "Attendance Calendar", href: "/student/attendance-calendar" },
                ],
              },
              {
                id: "campus",
                label: "Campus Life",
                icon: BookOpen,
                children: [
                  { label: "Mess", href: "/student/mess" },
                  { label: "Mess Bill", href: "/student/mess-bill" },
                  { label: "Complaints", href: "/student/complaints" },
                  { label: "Anti-Ragging", href: "/student/anti-ragging" },
                ],
              },
              {
                id: "account",
                label: "Account",
                icon: User,
                children: [
                  { label: "Profile", href: "/student/profile" },
                  { label: "Profile Security", href: "/student/profile-security" },
                  { label: "Digital ID", href: "/student/id" },
                  { label: "Notifications", href: "/student/notifications" },
                ],
              },
            ]}
          >
            {children}
          </RoleConsole>
          <DevContactStrip />
        </div>
      </Suspense>
    </AuthGuard>
  );
}
