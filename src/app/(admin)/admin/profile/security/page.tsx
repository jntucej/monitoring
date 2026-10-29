"use client";
import { Suspense } from "react";
import { PageLoading } from "@/components/admin/shared/LoadingStates";
import { AdminProfilePanel } from "../_panel";

export default function AdminProfileSecurity() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminProfilePanel tab="security" />
    </Suspense>
  );
}
