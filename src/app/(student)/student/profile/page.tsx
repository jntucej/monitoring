"use client";

import { Suspense } from "react";
import { UserProfileTab } from "@/components/shared/UserProfileTab";
import { RoleProfileSettingsPanel } from "@/components/nav/RoleProfileSettingsPanel";
import { RoleLogoutButton } from "@/components/shared/RoleLogoutButton";
import { AcademicPersonalSection } from "@/components/student/AcademicPersonalSection";
import { ThemePicker } from "@/components/student/ThemePicker";
import { SakugaControls } from "@/components/student/SakugaControls";
import { StudentPositionCard } from "@/components/student/StudentPositionCard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useAuthStore } from "@/stores/authStore";

import { User } from "lucide-react";

function StudentProfileInner() {
  const user = useAuthStore((s) => s.user);
  const isFemale = user?.studentDetails?.gender === "female";

  return (
    <div className="space-y-6 px-4 py-6 md:px-6 min-w-0">
      <div className="flex items-center gap-2">
        <User className="w-5 h-5 text-action-primary" />
        <p className="text-sm font-semibold text-primary">Your Student Profile</p>
      </div>
      {/* Position-aware card: varies by where you live (hosteller vs day
          scholar) and where you are now (in/out of campus). */}
      <StudentPositionCard />
      <UserProfileTab />
      <ThemePicker />
      {isFemale && <SakugaControls />}
      <AcademicPersonalSection />
      <RoleProfileSettingsPanel role="student" />
      <div className="flex justify-end">
        <RoleLogoutButton />
      </div>

    </div>
  );
}

export default function StudentProfilePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <StudentProfileInner />
    </Suspense>
  );
}
