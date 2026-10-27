"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reportClientError } from "@/lib/monitoring";

export default function HomeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, { route: "home", component: "HomeError", digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#070B14] px-6 text-center text-white">
      <h2 className="mb-4 text-2xl font-light tracking-tight">Something went wrong.</h2>
      <p className="mb-8 max-w-sm text-sm text-white/60">
        The gate monitor hit an unexpected snag while rendering.
      </p>
      <div className="flex items-center gap-4">
        <button
          onClick={() => reset()}
          className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm transition hover:bg-white/20"
        >
          Try again
        </button>
        <Link
          href="/"
          className="text-xs text-white/50 transition hover:text-white"
        >
          Return to story
        </Link>
      </div>
    </div>
  );
}
