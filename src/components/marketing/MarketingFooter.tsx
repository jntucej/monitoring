// src/components/marketing/MarketingFooter.tsx
//
// Shared bottom chrome for every public / marketing page.
// Server component — no client JS.

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { SITE } from "@/lib/seo/site-config";

const PRODUCT = [
  { label: "Features", href: "/features" },
  { label: "Security & trust", href: "/trust" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const LEGAL = [
  { label: "Privacy policy", href: "/privacy" },
  { label: "Terms of service", href: "/terms" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[2fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500 text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-slate-900">
              {SITE.name}
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
            A single, secure source of truth for campus movement, safety, and
            access — built by and operated at {SITE.college.name}.
          </p>
          <p className="mt-4 text-xs text-slate-400">
            {SITE.college.address}
          </p>
        </div>

        <nav aria-label="Product">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Product
          </h2>
          <ul className="mt-4 space-y-2.5">
            {PRODUCT.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-sm text-slate-600 transition hover:text-slate-900"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Legal">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Legal
          </h2>
          <ul className="mt-4 space-y-2.5">
            {LEGAL.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-sm text-slate-600 transition hover:text-slate-900"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-slate-400 sm:flex-row sm:px-6 lg:px-8">
          <span>
            © {new Date().getFullYear()} {SITE.college.name}. All rights reserved.
          </span>
          <span>Aligned with India's Digital Personal Data Protection Act 2023.</span>
        </div>
      </div>
    </footer>
  );
}

export default MarketingFooter;
