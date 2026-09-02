"use client";

import { BookOpen } from "lucide-react";

/**
 * Layout for /study pages.
 *
 * ponytail: login gate removed per owner request — resources are open for now.
 * Upgrade path: restore the sessionStorage gate (git history: 58aeba07^) or
 * real role + server auth if this ever protects anything sensitive.
 */

export default function StudyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-[100dvh] bg-[var(--bg-base)]">{children}</div>;
}

export function StudyHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-10 backdrop-blur-md bg-[var(--bg-surface)]/80 border-b border-[var(--border)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-[var(--action-primary)]" />
          <span className="font-bold text-sm text-[var(--text-primary)]">{title}</span>
        </div>
      </div>
    </header>
  );
}
