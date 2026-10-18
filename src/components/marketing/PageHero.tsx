// src/components/marketing/PageHero.tsx
//
// Visual breadcrumb + hero for the six inner marketing pages.
// Server component — no client JS.

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageHero({
  eyebrow,
  title,
  lede,
  crumbs,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  crumbs: { label: string; href: string }[];
}) {
  return (
    <section className="bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-16 sm:px-6 lg:px-8 lg:pb-24 lg:pt-20">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1 text-xs text-slate-500"
        >
          {crumbs.map((c, i) => (
            <span key={c.href} className="inline-flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              {i === crumbs.length - 1 ? (
                <span aria-current="page" className="text-slate-300">
                  {c.label}
                </span>
              ) : (
                <Link href={c.href} className="hover:text-slate-300">
                  {c.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        <span className="mt-6 inline-block text-xs font-semibold uppercase tracking-wider text-emerald-400">
          {eyebrow}
        </span>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 text-balance text-lg leading-relaxed text-slate-400">
          {lede}
        </p>
      </div>
    </section>
  );
}

export default PageHero;
