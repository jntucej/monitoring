// src/app/(marketing)/trust/page.tsx
//
// Security & trust page — the procurement-team reader.
// Targets: DPDP Act 2023 school software, row level security campus,
// campus data security.

import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Fingerprint,
  ScrollText,
  KeyRound,
  ScanFace,
  Bell,
  Database,
  Server,
  Activity,
  FileCheck2,
  Globe2,
  ArrowRight,
  Users,
  Clock,
} from "lucide-react";
import { SITE } from "@/lib/seo/site-config";
import { PageHero } from "@/components/marketing/PageHero";
import { BreadcrumbJsonLd } from "@/components/marketing/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "Security & trust | Gate Monitor",
  description:
    "How Gate Monitor protects student data: row-level security, MFA, immutable audit trails, DPDP Act 2023 alignment, retention policies, and role-scoped access.",
  alternates: { canonical: "/trust" },
  openGraph: {
    title: "Security & trust | Gate Monitor",
    description:
      "Student safety data is held to a higher standard. Row-level security, MFA, immutable audit, DPDP Act 2023 alignment.",
    url: `${SITE.url}/trust`,
  },
};

const PILLARS = [
  {
    icon: Lock,
    title: "Row-level security on every table",
    body:
      "Every database table is protected by PostgreSQL row-level security. Students see their own data. Parents see only their linked child. Wardens see only their hostel. No role can read what it was not granted.",
  },
  {
    icon: Fingerprint,
    title: "Multi-factor authentication",
    body:
      "Admin and sysadmin accounts require TOTP second factor. Biometric verification (thumbprint, face) is available at gate and hostel checkpoints. Privileged approvals additionally require a step-up approval password.",
  },
  {
    icon: ScrollText,
    title: "Immutable audit trail",
    body:
      "Every state change — approval, rejection, override, delegation, role change — is written to an append-only audit log with actor, role, timestamp, and full details. The log is queryable but never mutable.",
  },
  {
    icon: KeyRound,
    title: "Session control",
    body:
      "Session versioning lets administrators force-revoke every active token for a user in one action. Refresh tokens rotate on every use. Mobile tokens are device-bound.",
  },
  {
    icon: ScanFace,
    title: "Biometric checkpoints",
    body:
      "Optional thumbprint and face verification at hostel exit and gate entry. Biometric hashes are stored as one-way hashes — raw biometrics never leave the capture device.",
  },
  {
    icon: Bell,
    title: "Consent-first notifications",
    body:
      "Guardian notifications are opt-in per channel and per type. Consent records are timestamped, versioned, and revocable — aligned with India's DPDP Act 2023.",
  },
];

const COMPLIANCE = [
  {
    icon: Globe2,
    title: "DPDP Act 2023",
    body:
      "Consent capture, purpose limitation, data minimization, and data subject rights are built in. Parents and students can view, correct, or request erasure of their data.",
  },
  {
    icon: FileCheck2,
    title: "Audit-ready exports",
    body:
      "Every report can be exported as CSV or PDF with a deterministic hash of the source data. Institutional audits and regulator requests can be answered in minutes.",
  },
  {
    icon: Database,
    title: "Data residency",
    body:
      "Data is hosted on infrastructure you control, in a region you choose. No third-party sub-processors receive student data unless you configure them.",
  },
  {
    icon: Clock,
    title: "Retention policies",
    body:
      "Configurable retention windows per data category — audit logs, movement records, permission documents, consent records. Automated cleanup runs on a schedule with full audit.",
  },
];

const CONTROLS = [
  "Role hierarchy enforced at the database layer",
  "MFA required for privileged roles",
  "CSRF + trusted-header verification on mutations",
  "Per-endpoint rate limits",
  "Idempotency keys on critical mutations",
  "Forced session revocation",
  "Failed-login lockout with exponential backoff",
  "Encrypted secrets at rest",
  "Read-only container filesystems",
  "No shell access in production images",
  "Immutable audit trail across all modules",
  "Daily encrypted database backups",
];

const INFRA = [
  {
    icon: Server,
    title: "Containerized",
    body:
      "Every service runs in a hardened container image with a read-only filesystem, dropped Linux capabilities, and no shell access.",
  },
  {
    icon: Database,
    title: "Backups",
    body:
      "Nightly full backups, point-in-time recovery, and daily restore verification. Backup files are encrypted at rest and never leave the deployment region.",
  },
  {
    icon: Activity,
    title: "Monitoring",
    body:
      "Prometheus metrics, structured JSON logs, and uptime checks. Alerts fire on error-rate, latency, and failed-job thresholds within minutes.",
  },
  {
    icon: ShieldCheck,
    title: "Incident response",
    body:
      "Documented runbooks for the common failure modes. Every incident triggers a post-mortem and a corrective action tracked to closure.",
  },
];

export default function TrustPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Security & trust", path: "/trust" },
        ]}
      />
      <PageHero
        eyebrow="Security & trust"
        title="Student safety data is held to a higher standard."
        lede="Every layer — from the database to the kiosk — is built with the assumption that student movement data is sensitive and must be protected by default."
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Security & trust", href: "/trust" },
        ]}
      />

      {/* PILLARS */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Security by design, not by policy addendum.
            </h2>
            <p className="mt-4 text-balance text-base leading-relaxed text-slate-600">
              These are properties of the system — not aspirations. Every item
              below is enforceable today, in production.
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <p.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPLIANCE */}
      <section className="bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Compliance, built into the platform.
            </h2>
            <p className="mt-4 text-balance text-base leading-relaxed text-slate-400">
              Designed for Indian institutions operating under the DPDP Act
              2023, and for procurement teams who need to sign off on data
              protection.
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {COMPLIANCE.map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <c.icon className="h-5 w-5 text-emerald-400" />
                <h3 className="mt-4 text-sm font-semibold text-white">
                  {c.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTROLS */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[2fr_1fr] lg:items-start">
            <div>
              <h2 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Technical controls.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Each of these controls is enforced by the platform, not
                documented as a future commitment.
              </p>
              <ul className="mt-8 grid gap-2.5 sm:grid-cols-2">
                {CONTROLS.map((c) => (
                  <li
                    key={c}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <span className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    </span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <Users className="h-5 w-5 text-slate-500" />
              <h3 className="mt-3 text-sm font-semibold text-slate-900">
                For procurement teams
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                A security questionnaire, data processing agreement, and prior
                assessment pack can be requested directly from the{" "}
                {SITE.college.shortName} team.
              </p>
              <Link
                href="/contact"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Request pack <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* INFRASTRUCTURE */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Operated like an infrastructure product.
            </h2>
            <p className="mt-4 text-balance text-base leading-relaxed text-slate-600">
              Backups, monitoring, incident response — the boring parts that
              matter when something goes wrong at 2am.
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {INFRA.map((i) => (
              <div
                key={i.title}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <i.icon className="h-5 w-5 text-emerald-600" />
                <h3 className="mt-3 text-sm font-semibold text-slate-900">
                  {i.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {i.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-emerald-500">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:px-8">
          <div>
            <h2 className="text-balance text-2xl font-semibold text-slate-950 sm:text-3xl">
              Need a security questionnaire answered?
            </h2>
            <p className="mt-2 text-sm text-slate-900/80">
              We respond to procurement and IT teams within one business day.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Contact the team <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
