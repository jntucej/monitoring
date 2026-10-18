// src/components/marketing/MarketingHeader.tsx
//
// Shared top chrome for every public / marketing page.
// Server component — no client JS, no hydration.

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { SITE } from "@/lib/seo/site-config";

const NAV = [
  { label: "Features", href: "/features" },
  { label: "Security & trust", href: "/trust" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500 text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight text-slate-900">
              {SITE.name}
            </span>
            <span className="block text-[11px] text-slate-500">
              {SITE.college.shortName}
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Book a demo
          </Link>
        </div>
      </div>
    </header>
  );
}

export default MarketingHeader;
