"use client";

import { Suspense } from "react";
import { UserProfileTab } from "@/components/shared/UserProfileTab";
import { AcademicPersonalSection } from "@/components/student/AcademicPersonalSection";
import { PageLoading } from "@/components/shared/LoadingStates";

import { User } from "lucide-react";

function StudentProfileInner() {
  return (
    <div className="space-y-6 px-4 py-6 md:px-6 min-w-0">
      <div className="flex items-center gap-2">
        <User className="w-5 h-5 textaction-primary" />
        <p className="text-sm font-semibold text-primary">Your Student Profile</p>
      </div>
      <UserProfileTab />
      <AcademicPersonalSection />

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
