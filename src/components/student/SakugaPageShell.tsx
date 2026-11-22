"use client";

// SakugaPageShell — the single "apply sakuga to this surface" wrapper.
//
// This is the containerized entry point the user asked for: to give a page or
// component the sakuga theme, wrap it in <SakugaPageShell>. That's the ONLY
// integration a new surface needs — no per-component theme plumbing, no
// remembering to call useIsSakuga + SakugaLoadingSplash by hand.
//
//   import { SakugaPageShell } from "@/components/student/SakugaPageShell";
//   export default function MyPage() {
//     return <SakugaPageShell>{content}</SakugaPageShell>;
//   }
//
// Behaviour:
//  - Sakuga users (data-theme="sakuga" on <html>): the children render inside
//    the anime VFX loading splash, which auto-dismisses once settled. The
//    splash is scoped to THIS subtree (it's a fixed overlay that hides when
//    done), so it never leaks to sibling pages.
//  - Graphite / default-theme users: renders children as-is, zero extra nodes
//    or overlays.
//
// Detection: polls document.documentElement for data-theme="sakuga" a few
// ticks (the theme is set post-login by ClientProviders) and watches for
// live theme switches via the shared useIsSakuga gate.

import { Suspense, lazy, type ReactNode } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useIsSakuga } from "@/components/student/useIsSakuga";

const SakugaLoadingSplash = lazy(
  () => import("@/components/SakugaLoadingSplash").then((m) => ({
    default: m.SakugaLoadingSplash,
  })),
);

export function SakugaPageShell({ children }: { children: ReactNode }) {
  const isSakuga = useIsSakuga();

  // Non-sakuga users: no overlay, no extra nodes — just the content.
  if (!isSakuga) return <>{children}</>;

  // Sakuga users: show the content under the anime splash until it settles.
  // Suspense so the lazily-loaded splash doesn't block first paint.
  return (
    <Suspense fallback={<PageLoading />}>
      <SakugaLoadingSplash>{children}</SakugaLoadingSplash>
    </Suspense>
  );
}
