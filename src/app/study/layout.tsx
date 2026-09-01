"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { BookOpen } from "lucide-react";

/**
 * Client-side gate for /study pages.
 * ponytail: cosmetic-only check — the flag lives in sessionStorage and the
 * credentials ship with the bundle. Fine for shared study material.
 * Upgrade path: real role + server auth if this ever protects anything sensitive.
 */

export const STUDY_AUTH_KEY = "gate-monitor-study-auth";

// No-op subscribe: the flag only ever changes right before a navigation,
// which remounts this layout — no live updates needed.
const noopSubscribe = () => () => {};

export default function StudyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const status = useSyncExternalStore(
    noopSubscribe,
    () => (sessionStorage.getItem(STUDY_AUTH_KEY) === "true" ? "allowed" : "denied"),
    () => "checking" // server snapshot: render spinner, resolve after hydration
  );

  useEffect(() => {
    if (status === "denied") router.replace("/study-login");
  }, [status, router]);

  if (status !== "allowed") {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[var(--bg-base)]">
        <div className="w-10 h-10 border-4 border-[var(--action-primary)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-[var(--text-muted)]">Checking access...</p>
      </div>
    );
  }

  return <div className="min-h-[100dvh] bg-[var(--bg-base)]">{children}</div>;
}

export function StudyHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-10 backdrop-blur-md bg-[var(--bg-surface)]/80 border-b border-[var(--border)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-[var(--action-primary)]" />
          <span className="font-bold text-sm text-[var(--text-primary)]">{title}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.removeItem(STUDY_AUTH_KEY);
            } catch {}
            router.push("/study-login");
          }}
          className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          Exit Portal
        </button>
      </div>
    </header>
  );
}
