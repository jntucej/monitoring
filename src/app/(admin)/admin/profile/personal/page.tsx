"use client";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AdminProfilePanel } from "../_panel";

export default function AdminProfilePersonal() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminProfilePanel tab="personal" />
    </Suspense>
  );
}
