import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthContext } from "@/lib/authContext";
import { getDefaultRouteForRole } from "@/server/policy/routes";
import { LiveStatePill } from "./LiveStatePill";
import { LiveStatsStrip } from "./LiveStatsStrip";

const STEPS = [
  {
    title: "Request",
    body: "Students, parents and staff raise gate passes and permission tickets from their role dashboard.",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />,
  },
  {
    title: "Approve",
    body: "Wardens, principals and HODs act on a single queue with SLA tracking and a full audit trail.",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />,
  },
  {
    title: "Track",
    body: "Every scan updates occupancy, curfew scores and daily statistics in real time at every gate.",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  },
] as const;

export default async function HomePage() {
  const token = (await cookies()).get("access_token")?.value;
  if (token) {
    try {
      const auth = await createAuthContext(token);
      if (auth?.isAuthenticated) redirect(getDefaultRouteForRole(auth.role));
    } catch {
      /* fall through to public homepage */
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-emerald-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-zinc-950"
      >
        Skip to content
      </a>

      {/* Single atmospheric layer — static CSS, zero JS */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(16,185,129,0.10), transparent 70%), radial-gradient(40% 35% at 85% 90%, rgba(99,102,241,0.08), transparent 70%)",
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Campus Gate Monitor</p>
            <p className="text-xs text-zinc-500">JNTUCEJ · Live operations</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LiveStatePill />
          <Link
            href="/login"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main id="main" className="relative z-10 mx-auto max-w-6xl px-6">
        <section className="mx-auto max-w-3xl pb-14 pt-16 text-center md:pt-24">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Live · Campus access operations
          </p>
          <h1 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">
            One campus. Every gate.{" "}
            <span className="block bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
              Fully accounted for.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-zinc-400 md:text-lg">
            Gate passes, hostel permissions, mess tokens and occupancy — one
            system of record for students, approvers and gate operators.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="w-full rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 sm:w-auto"
            >
              Sign in with college id
            </Link>
            <a
              href="#live"
              className="w-full rounded-lg border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 sm:w-auto"
            >
              View live status
            </a>
          </div>
        </section>

        <LiveStatsStrip />

        <section aria-labelledby="how-heading" className="pb-20 pt-16">
          <h2 id="how-heading" className="text-center text-sm font-semibold uppercase tracking-widest text-zinc-500">
            How it works
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <article
                key={step.title}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 transition-colors hover:border-zinc-700"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/25">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden>
                    {step.icon}
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-semibold">
                  <span className="mr-2 text-zinc-600">{String(i + 1).padStart(2, "0")}</span>
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{step.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-zinc-900 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 text-xs text-zinc-600 md:flex-row">
          <p>Campus Gate Monitor · JNTU College of Engineering Jagtial</p>
          <p>Operator kiosk available at every active gate</p>
        </div>
      </footer>
    </div>
  );
}
