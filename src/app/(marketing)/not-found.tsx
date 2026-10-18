// src/app/(marketing)/not-found.tsx
//
// Marketing-styled 404 for any bad public URL. Prevents the app's auth shell
// from leaking branding on a 404 under the marketing cluster.

import Link from "next/link";
import { Compass, ArrowRight } from "lucide-react";

export default function MarketingNotFound() {
  return (
    <section className="bg-white">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-8">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Compass className="h-6 w-6" />
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          That page doesn&apos;t exist.
        </h1>
        <p className="mt-3 max-w-md text-base leading-relaxed text-slate-600">
          The URL you followed may be outdated. Start from the homepage, or
          jump straight to what you were looking for.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Home <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/features"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Features
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Contact
          </Link>
        </div>
      </div>
    </section>
  );
}
