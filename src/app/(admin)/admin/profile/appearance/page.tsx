"use client";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AdminProfilePanel } from "../_panel";

export default function AdminProfileAppearance() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminProfilePanel tab="appearance" />
    </Suspense>
  );
}
