// src/app/(marketing)/about/page.tsx
//
// Origin story + institution block. Replaces the old src/app/about/page.tsx.
// Server component. No client JS.

import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { SITE } from "@/lib/seo/site-config";
import { PageHero } from "@/components/marketing/PageHero";
import { BreadcrumbJsonLd } from "@/components/marketing/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "About | Gate Monitor",
  description:
    "Gate Monitor is built by the team at JNTU College of Engineering Jagtial to give Indian campuses a single, secure source of truth for student movement, safety, and access.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About | Gate Monitor",
    description:
      "Built by the team at JNTUCEJ to give Indian campuses a single, secure source of truth for student movement and safety.",
    url: `${SITE.url}/about`,
  },
};

const TIMELINE = [
  {
    year: "2023",
    title: "First gates wired",
    body:
      "The pilot covered three gates and a single hostel block, replacing paper registers and spreadsheet reconciliation.",
  },
  {
    year: "2024",
    title: "Guardian portal",
    body:
      "Parents gained direct visibility into their child's movement and pass approvals, replacing phone calls to the hostel office.",
  },
  {
    year: "2025",
    title: "Workflow unification",
    body:
      "Outpass, leave, exam access, and mess operations moved onto one shared permission engine — one audit trail, one config surface.",
  },
  {
    year: "2026",
    title: "Exam-day access control",
    body:
      "The exam branch and superintendents got a dedicated workflow for candidate-only campus access, with full anomaly detection.",
  },
];

export default function AboutPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ]}
      />
      <PageHero
        eyebrow="About"
        title="Built by a campus, for campuses."
        lede={`Gate Monitor started at ${SITE.college.name} to solve a problem every Indian institution knows: fragmented registers, missed approvals, and no single source of truth for who is on campus and why.`}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "About", href: "/about" },
        ]}
      />

      {/* MISSION */}
      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Safety without surveillance.
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              We believe student safety and student privacy are not opposing
              goals. A campus can know who is inside, why they left, and when
              they returned — without turning every corridor into a camera or
              every warden into a screen-watcher.
            </p>
            <p>
              Gate Monitor records what matters and nothing more: authorized
              movements, approval decisions, and the audit trail that connects
              them. Every access decision has a reason, an approver, and a
              timestamp. Every student retains visibility into their own
              record.
            </p>
            <p>
              The platform is built on the principle that parents deserve to
              know their child is safe, wardens deserve tools that respect
              their time, and students deserve a system that never confuses
              monitoring with mistrust.
            </p>
          </div>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            How we got here.
          </h2>
          <ol className="mt-10 space-y-8 border-l-2 border-emerald-200 pl-8">
            {TIMELINE.map((t) => (
              <li key={t.year} className="relative">
                <span className="absolute -left-[41px] grid h-5 w-5 place-items-center rounded-full bg-emerald-500 ring-4 ring-slate-50">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                  {t.year}
                </span>
                <h3 className="mt-1.5 text-lg font-semibold text-slate-900">
                  {t.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {t.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* INSTITUTION */}
      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              Built and operated at {SITE.college.name}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Gate Monitor is a production system at {SITE.college.shortName}.
              The team that builds it runs it — every feature ships because it
              solves a real operational problem observed on our own campus.
            </p>
            <div className="mt-6 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                {SITE.college.address}
              </p>
              <p className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <a href={`mailto:${SITE.college.email}`} className="hover:text-slate-900">
                  {SITE.college.email}
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-emerald-500">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:px-8">
          <div>
            <h2 className="text-balance text-2xl font-semibold text-slate-950 sm:text-3xl">
              Want to see it running?
            </h2>
            <p className="mt-2 text-sm text-slate-900/80">
              Book a walkthrough, ask about pricing, or just say hello.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Contact us <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
