// src/app/not-found.tsx
//
// Global 404. Rendered for any unknown URL that doesn't match a route group's
// not-found.tsx. Kept neutral (no app chrome, no marketing branding) so it
// works both for unauthenticated visitors and for the case where a role page
// 404s outside its group.

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function GlobalNotFound() {
  return (
    <section className="min-h-[70vh] bg-white">
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <span className="text-6xl font-semibold text-text-secondary">404</span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-text-primary">
          Page not found
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-text-muted">
          The page you&apos;re looking for doesn&apos;t exist or was moved.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-action-success px-4 py-2 text-sm font-semibold text-black hover:bg-action-success"
          >
            Home <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-text-primary hover:bg-bg-elevated"
          >
            Sign in
          </Link>
          <Link
            href="/help"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-text-primary hover:bg-bg-elevated"
          >
            Help
          </Link>
        </div>
      </div>
    </section>
  );
}
