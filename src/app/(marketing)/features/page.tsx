// src/app/(marketing)/features/page.tsx
//
// SEO anchor of the cluster. Targets:
//   - campus access management features
//   - hostel outpass management
//   - gate tracking software
//   - parent portal for schools
//   - exam day access control
//
// Server component. No client JS.

import type { Metadata } from "next";
import Link from "next/link";
import {
  QrCode,
  Home,
  Users,
  GraduationCap,
  UtensilsCrossed,
  BarChart3,
  ShieldCheck,
  Fingerprint,
  ScanFace,
  ScrollText,
  Bell,
  ArrowRight,
  BookOpen,
  ClipboardList,
  CalendarClock,
  DoorOpen,
  Lock,
  Clock,
} from "lucide-react";
import { SITE } from "@/lib/seo/site-config";
import { PageHero } from "@/components/marketing/PageHero";
import { BreadcrumbJsonLd } from "@/components/marketing/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "Features — campus access management | Gate Monitor",
  description:
    "Gate tracking, hostel outpass workflows, parent portal, exam-day access control, mess tokens, and analytics — every capability of Gate Monitor's campus access platform.",
  alternates: { canonical: "/features" },
  openGraph: {
    title: "Features — campus access management | Gate Monitor",
    description:
      "Every capability of Gate Monitor's campus access platform, from gate scans to exam-day access control.",
    url: `${SITE.url}/features`,
  },
};

/* ─────────────────────────────────────────────────────────────────── */
/* Content                                                            */
/* ─────────────────────────────────────────────────────────────────── */

const MODULES = [
  {
    icon: DoorOpen,
    eyebrow: "Gate & movement",
    title: "Gate verification at every entrance",
    body:
      "QR, barcode, face, and thumbprint verification at main gates, hostel gates, and back gates. Each scan is timestamped, attributed to an operator, and tied to an authorization record. Duplicate scans inside the configurable window collapse silently so the ledger reflects reality, not retries.",
    bullets: [
      "Auto-alternating IN/OUT based on the last known state",
      "Manual entry with mandatory reason and full audit",
      "Kiosk-mode scanning for shared operator stations",
      "Back-gate geo-fencing with radius enforcement",
      "Real-time operator stats and shift handover",
    ],
  },
  {
    icon: Home,
    eyebrow: "Hostel outpass",
    title: "Multi-level outpass approval workflow",
    body:
      "Configurable chains — caretaker → deputy warden → hostel manager → principal — with SLA deadlines, step-up password verification for privileged approvals, and biometric checkpoints at each stage. Bulk actions and direct-generate flows for emergencies, all fully audited.",
    bullets: [
      "Stage-by-stage history with actor, timestamp, and reason",
      "Direct generation with step-up verification for emergencies",
      "Departmental and hostel-scope routing",
      "Document upload (medical certs, letters) and e-signature",
      "Biometric verification at hostel and gate checkpoints",
    ],
  },
  {
    icon: Users,
    eyebrow: "Guardian portal",
    title: "Real-time visibility for parents",
    body:
      "Every linked guardian sees their child's current campus status, movement history, pending requests, and every approval decision — without calling the hostel office. Notification preferences are per-parent and per-type, aligned with DPDP Act 2023 consent requirements.",
    bullets: [
      "Live in/out status with gate and timestamp",
      "Pass and leave approval from the parent portal",
      "Event and exam registration visibility",
      "Direct developer messaging for issues",
      "Weekly attendance digest per child",
    ],
  },
  {
    icon: GraduationCap,
    eyebrow: "Exam-day access",
    title: "Lock the campus to authorized candidates",
    body:
      "Exam superintendents and the exam branch can open or close campus access for a specific exam day. Only authorized candidate roll numbers pass. Every denied access is logged with reason and escalated to OIE — no override without an audit trail.",
    bullets: [
      "Per-day access state controlled by the superintendent",
      "Candidate roll-number allowlist",
      "Access exceptions with severity and resolution",
      "Exam-branch discrepancy and handoff queues",
      "Live access log for the examination control room",
    ],
  },
  {
    icon: UtensilsCrossed,
    eyebrow: "Mess operations",
    title: "Preference declaration and token verification",
    body:
      "Students declare their meal preference (veg / non-veg / sub-items) within the meal window. The system generates scannable tokens, operators verify at the counter, and no-shows auto-flag. Counts reconcile against declared preferences without spreadsheets.",
    bullets: [
      "Menu items configurable per day type",
      "Automatic count and ingredient reconciliation",
      "No-show detection and reminder pipeline",
      "Bulk finalization and revocation with audit",
      "Per-hostel-block attendance breakdown",
    ],
  },
  {
    icon: BarChart3,
    eyebrow: "Analytics",
    title: "Operational and academic intelligence",
    body:
      "Traffic, occupancy, department activity, attendance, and anomaly detection — with exportable reports for administrators and academic leadership. Predictive models flag unusual spikes before they become incidents.",
    bullets: [
      "Daily, weekly, and monthly report exports (CSV / PDF)",
      "Department and hostel occupancy heatmaps",
      "Attendance calendar per student",
      "Custom saved report definitions",
      "Sustainability metrics (paperless passes)",
    ],
  },
];

const ROLES = [
  {
    icon: GraduationCap,
    label: "Students",
    bullets: [
      "Digital ID with rotating QR",
      "Pass application and tracking",
      "Leave requests and status",
      "Mess preference declaration",
      "Notification inbox",
    ],
  },
  {
    icon: Users,
    label: "Parents & guardians",
    bullets: [
      "Live child status",
      "Movement history",
      "Pass approvals",
      "Event visibility",
      "Quiet-hours notification preference",
    ],
  },
  {
    icon: BookOpen,
    label: "Faculty & HODs",
    bullets: [
      "Class rosters and attendance",
      "Department permission queues",
      "Student directory",
      "Attendance exception reports",
      "Department analytics",
    ],
  },
  {
    icon: Home,
    label: "Wardens & caretakers",
    bullets: [
      "Outpass approval queue",
      "Hostel occupancy view",
      "Resident service requests",
      "Room allocation",
      "Incident reporting",
    ],
  },
  {
    icon: QrCode,
    label: "Gate operators",
    bullets: [
      "Kiosk scanning (QR / barcode / face / thumbprint)",
      "Manual entry with audit",
      "Pass verification",
      "Exception logging",
      "Shift handover",
    ],
  },
  {
    icon: ShieldCheck,
    label: "Administrators",
    bullets: [
      "Full institutional configuration",
      "Role and policy management",
      "Audit trail review",
      "Backup and restore",
      "Compliance exports",
    ],
  },
];

const INTEGRATIONS = [
  {
    icon: BookOpen,
    title: "LMS",
    body: "Moodle, Canvas, Blackboard, Sakai — roster sync and attendance push.",
  },
  {
    icon: ClipboardList,
    title: "HR system",
    body: "Employee roster sync with department and designation mapping.",
  },
  {
    icon: ShieldCheck,
    title: "LDAP / SSO",
    body: "Directory sync and OIDC single sign-on (Google, Azure AD, Okta).",
  },
  {
    icon: Bell,
    title: "Notifications",
    body: "Email, SMS, push, and in-app — configurable per user, per type.",
  },
  {
    icon: ScanFace,
    title: "Biometric devices",
    body: "TCP-socket sync for standard fingerprint and face terminals.",
  },
  {
    icon: Fingerprint,
    title: "WebAuthn",
    body: "Platform authenticators (Touch ID, Windows Hello) for step-up.",
  },
];

const FAQ = [
  {
    q: "Does the system work for both hostellers and day scholars?",
    a: "Yes. Hostellers and day scholars have distinct entry/exit rules, pass flows, and outpass approval chains. Day scholars are automatically identified from the roll number, and entry types can be changed at the gate with full audit.",
  },
  {
    q: "Can we customize the approval chain?",
    a: "Yes. The hostel outpass workflow is configuration-driven. You can add or remove stages (caretaker, deputy warden, hostel manager, principal), set SLA deadlines per stage, and require step-up passwords for privileged approvals.",
  },
  {
    q: "What happens if the internet is down at a gate?",
    a: "The operator kiosk queues scans locally and replays them when connectivity returns, with a visible queue banner and deduplication. Scans are never lost — they are replayed with their original client-generated ID.",
  },
  {
    q: "How does exam-day access differ from regular access?",
    a: "On an exam day, the superintendent opens access for a specific day and specifies an allowlist of candidate roll numbers. Any roll number not on the allowlist is denied and logged with a discrepancy record for the OIE team.",
  },
  {
    q: "Can parents see live movement?",
    a: "Parents see every authorized movement of their linked child — direction, gate, timestamp, and the reason tied to the outpass. They do not see movement data for any other student.",
  },
  {
    q: "Is there a mobile app?",
    a: "The platform is mobile-first. A single responsive web app works on Android and iOS, and the operator console can be installed as a PWA on a kiosk device.",
  },
];

export default function FeaturesPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Features", path: "/features" },
        ]}
      />
      <PageHero
        eyebrow="Features"
        title="Every capability of a modern campus access platform."
        lede="Six modules covering the full student journey — from the front gate to the mess counter to the exam hall — unified in one role-aware system."
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Features", href: "/features" },
        ]}
      />

      {/* MODULES */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl divide-y divide-slate-200 px-4 py-20 sm:px-6 lg:px-8">
          {MODULES.map((m) => (
            <article
              key={m.title}
              className="grid gap-10 py-14 first:pt-0 last:pb-0 lg:grid-cols-[auto_1fr] lg:gap-14"
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <m.icon className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                  {m.eyebrow}
                </span>
                <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  {m.title}
                </h2>
                <p className="mt-3 text-balance text-base leading-relaxed text-slate-600">
                  {m.body}
                </p>
                <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                  {m.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-2 text-sm text-slate-700"
                    >
                      <span className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ROLES */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Six portals, one backend.
            </h2>
            <p className="mt-4 text-balance text-base leading-relaxed text-slate-600">
              Role-based access is enforced at the database layer with
              row-level security — not just in the UI. Every role sees
              exactly what they need and nothing more.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((r) => (
              <div
                key={r.label}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                  <r.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {r.label}
                </h3>
                <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                  {r.bullets.map((b) => (
                    <li key={b}>· {b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Connects to what you already run.
            </h2>
            <p className="mt-4 text-balance text-base leading-relaxed text-slate-600">
              No rip-and-replace. Gate Monitor plugs into your existing LMS,
              HR system, identity provider, and biometric hardware.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {INTEGRATIONS.map((i) => (
              <div
                key={i.title}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <i.icon className="h-5 w-5 text-emerald-600" />
                <h3 className="mt-3 text-sm font-semibold text-slate-900">
                  {i.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {i.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
          <h2 className="text-balance text-center text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Common questions
          </h2>
          <div className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {FAQ.map((item) => (
              <details key={item.q} className="group p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-slate-900">
                    {item.q}
                  </span>
                  <span className="text-slate-400 transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {item.a}
                </p>
              </details>
            ))}
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
              href="/trust"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-950/20 bg-white/90 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-white"
            >
              Security &amp; trust
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
