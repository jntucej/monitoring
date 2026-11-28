"use client";

/**
 * /student/services — static wayfinding + direct statutory channels.
 */
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { StudentServices } from "@/components/student/StudentServices";

export default function StudentServicesPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <StudentServices />
    </Suspense>
  );
}
