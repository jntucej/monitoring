// src/app/(marketing)/page.tsx
//
// Public landing page — SEO anchor of the marketing cluster.
// Replaces the previous `redirect("/login")` so / is indexable.
// Server component, no client JS.

import type { Metadata } from "next";
import Link from "next/link";
import {
  QrCode,
  Home,
  Users,
  GraduationCap,
  BarChart3,
  ShieldCheck,
  ScanFace,
  Fingerprint,
  ArrowRight,
} from "lucide-react";
import { SITE } from "@/lib/seo/site-config";

export const metadata: Metadata = {
  title: `${SITE.name} — campus access management platform`,
  description:
    "Gate tracking, hostel outpass workflows, parent portal, exam-day access control, and mess operations — one role-aware system for Indian campuses, aligned with the DPDP Act 2023.",
  alternates: { canonical: SITE.url + "/" },
  openGraph: {
    title: `${SITE.name} — a single source of truth for campus movement & safety`,
    description:
      "Gate tracking, outpass approvals, parent portal, exam-day access control, mess tokens, and analytics — unified in one platform.",
    url: SITE.url + "/",
  },
};

const HIGHLIGHTS = [
  {
    icon: QrCode,
    title: "Gate verification",
    body: "QR, barcode, face, and thumbprint scans at every gate — timestamped, attributed, and audit-tied.",
  },
  {
    icon: Home,
    title: "Hostel outpass",
    body: "Multi-level approval chains (caretaker → warden → hostel manager → principal) with SLA deadlines and step-up verification.",
  },
  {
    icon: Users,
    title: "Guardian portal",
    body: "Parents see live status, movement history, and every approval decision for their linked child — without calling the hostel office.",
  },
  {
    icon: GraduationCap,
    title: "Exam-day access",
    body: "Superintendents lock the campus to authorized candidates. Every denial is logged and escalated to the OIE.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    body: "Traffic, occupancy, attendance, and anomaly detection — with exportable reports for administrators.",
  },
  {
    icon: ShieldCheck,
    title: "Row-level security",
    body: "Role-based access enforced at the database layer, not just in the UI. MFA on every privileged account.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Wire the gates",
    body: "Install a kiosk at each gate. Connect to your existing biometric terminals or use QR + face capture. Scans stream live to the control room.",
  },
  {
    n: "02",
    title: "Model the approval chain",
    body: "Define outpass, leave, and mess-token workflows per hostel, per department, per role. Set SLAs and step-up passwords where needed.",
  },
  {
    n: "03",
    title: "Open the portals",
    body: "Students, parents, faculty, wardens, operators, and administrators each get the exact dashboard their role needs — and nothing more.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            Built for Indian campuses · DPDP Act 2023 aligned
          </span>
          <h1 className="mt-6 max-w-3xl text-balance text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            A single source of truth for who is on campus, and why.
          </h1>
          <p className="mt-6 max-w-2xl text-balance text-lg leading-relaxed text-slate-400">
            {SITE.name} unifies gate movement, hostel outpass, leave,
            exam-day access, and mess operations into one role-aware
            platform. Every scan, approval, and exception is tied to an
            audit trail — so safety and privacy are not in tension.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Book a demo <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Explore features
            </Link>
          </div>
        </div>
      </section>

      {/* HIGHLIGHTS */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Six modules, one permission engine.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Everything from the front gate to the exam hall runs on the
              same data model, the same audit log, and the same role
              hierarchy.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {HIGHLIGHTS.map((h) => (
              <div
                key={h.title}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                  <h.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {h.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {h.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
          <h2 className="text-balance text-center text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            From paper registers to a single ledger.
          </h2>
          <ol className="mt-12 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-2xl border border-slate-200 bg-white p-6">
                <span className="text-xs font-semibold text-emerald-600">
                  STEP {s.n}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="bg-slate-950">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-3 lg:px-8">
          <div>
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            <h3 className="mt-3 text-base font-semibold text-white">
              Security by design
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Row-level security on every table, MFA for privileged roles,
              and an immutable audit trail.{" "}
              <Link href="/trust" className="text-emerald-400 hover:underline">
                Read the security posture →
              </Link>
            </p>
          </div>
          <div>
            <Fingerprint className="h-6 w-6 text-emerald-400" />
            <h3 className="mt-3 text-base font-semibold text-white">
              Biometric checkpoints
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Optional thumbprint and face verification at hostel and gate
              exits. Raw biometrics never leave the capture device.{" "}
              <Link href="/features" className="text-emerald-400 hover:underline">
                See all features →
              </Link>
            </p>
          </div>
          <div>
            <ScanFace className="h-6 w-6 text-emerald-400" />
            <h3 className="mt-3 text-base font-semibold text-white">
              Exam-day lockdown
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              A dedicated superintendent and exam-branch workflow for
              candidate-only campus access, with anomaly detection.{" "}
              <Link href="/trust" className="text-emerald-400 hover:underline">
                Compliance notes →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-emerald-500">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:px-8">
          <div>
            <h2 className="text-balance text-2xl font-semibold text-slate-950 sm:text-3xl">
              See it running on a real campus.
            </h2>
            <p className="mt-2 text-sm text-slate-900/80">
              Book a walkthrough with the team behind {SITE.college.shortName}.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Book a demo <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-950/20 bg-white/90 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-white"
            >
              Our story
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
