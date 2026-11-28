"use client";

/**
 * /student/bridge — the 3-tab Authority Bridge (Class Feed / @agent / Private Vault).
 * All data comes from /api/student/state + /api/agent/llm-circuit + /api/bot/chat.
 */
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { StudentAuthorityBridge } from "@/components/student/StudentAuthorityBridge";

export default function StudentBridgePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <StudentAuthorityBridge />
    </Suspense>
  );
}
