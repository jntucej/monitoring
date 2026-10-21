import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  ShieldCheck,
  GraduationCap,
  Users,
  Briefcase,
  Building2,
  Crown,
  ScanLine,
  Settings,
  Server,
  LogIn,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  Lock,
  FileCheck,
  Clock,
  MapPin,
  Mail,
  Phone,
  Award,
  BookOpen,
} from "lucide-react";
import { createAuthContext } from "@/lib/authContext";
import { getDefaultRouteForRole } from "@/server/policy/routes";
import { LiveStatePill } from "./LiveStatePill";
import { LiveStatsStrip } from "./LiveStatsStrip";
import { COLLEGE } from "@/lib/college-config";
import {
  buildPageMetadata,
  organizationJsonLd,
  websiteJsonLd,
  faqJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: `Official Campus Portal | ${COLLEGE.officialName}`,
  description: COLLEGE.portalPurpose,
  path: "/",
});

export const dynamic = "force-dynamic";

/* ── verified role list ─────────────────────────────────────────── */
const ROLES = [
  {
    label: "Students",
    href: "/login?role=student",
    icon: GraduationCap,
    blurb:
      "Digital ID, gate passes, permissions, attendance calendar and mess services.",
  },
  {
    label: "Parents & Guardians",
    href: "/login?role=parent",
    icon: Users,
    blurb: "Child status, movement timeline, pass requests and notifications.",
  },
  {
    label: "Faculty",
    href: "/login?role=faculty",
    icon: Briefcase,
    blurb: "Class attendance, subject permissions and student directory.",
  },
  {
    label: "Hostel Staff",
    href: "/login?role=hostel-manager",
    icon: Building2,
    blurb: "Outpass approvals, room allocation, resident tickets and handovers.",
  },
  {
    label: "Administration",
    href: "/login?role=principal",
    icon: Crown,
    blurb: "Approval centre, audit, department analytics and oversight.",
  },
  {
    label: "Gate Operators",
    href: "/login?role=operator",
    icon: ScanLine,
    blurb: "Scan verification, manual entry, transactions and exceptions.",
  },
  {
    label: "Campus Admin",
    href: "/login?role=admin",
    icon: Settings,
    blurb: "Users, gates, roles, configuration, reports and audit logs.",
  },
  {
    label: "System Admin",
    href: "/login?role=sysadmin",
    icon: Server,
    blurb: "System health, security, data lifecycle and platform configuration.",
  },
];

/* ── verified academic content ─────────────────────────────────── */
const UG_PROGRAMMES = [
  "B.Tech — Electrical & Electronics Engineering (EEE)",
  "B.Tech — Mechanical Engineering (ME)",
  "B.Tech — Electronics & Communication Engineering (ECE)",
  "B.Tech — Computer Science & Engineering (CSE)",
  "B.Tech — Information Technology (IT)",
];

const PG_PROGRAMMES = [
  "M.Tech — Electrical Power Systems (EEE)",
  "M.Tech — Engineering Design (ME)",
  "M.Tech — Digital Systems & Computer Electronics (ECE)",
  "M.Tech — Computer Science & Engineering (CSE)",
  "M.Tech — Cyber Security (new from 2024-25)",
];

const FLOW_STEPS = [
  {
    title: "Request",
    body: "A student raises a permission or gate-pass request through the portal.",
  },
  {
    title: "Approve",
    body: "The correct approver stage — caretaker, warden, HOD, principal — reviews and decides.",
  },
  {
    title: "Scan",
    body: "The gate operator scans or manually enters the roll number at the assigned gate.",
  },
  {
    title: "Record",
    body: "Every movement is written to an audit-logged record with gate, direction and reason.",
  },
];

const SECURITY_POINTS = [
  "Role-scoped access control — every role sees only what it is authorised for.",
  "Multi-factor sign-in available for privileged and administrative accounts.",
  "Every permission decision, movement scan and configuration change is audit-logged.",
  "Personal data is minimised, encrypted where required, and retained per policy.",
];

const FAQS = [
  {
    q: "How do I sign in to the JNTUH UCEJ campus portal?",
    a: "Use the Sign in button on this page and enter the campus account issued by your department or the administrator. Students, parents, faculty, staff and administrators each have a dedicated dashboard.",
  },
  {
    q: "I forgot my password or PIN. What do I do?",
    a: "Use the Forgot password link on the sign-in screen, or contact your campus administrator. Password and PIN resets are audit-logged and require verification.",
  },
  {
    q: "Which services are available to students?",
    a: "Students can view their digital ID, active gate passes, permission requests, attendance calendar, mess services, complaints and movement history.",
  },
  {
    q: "Can parents see their child's movement?",
    a: "Yes. Parents and guardians with a verified link to a student can see that student's campus status, movement timeline and open requests.",
  },
  {
    q: "Where is JNTUH UCEJ located?",
    a: "JNTUH University College of Engineering Jagtial is at Nachupally (Kondagattu), Kodimial Mandal, Jagtial District, Telangana – 505 501, India.",
  },
  {
    q: "Who do I contact for help?",
    a: "Use the Help & Support page, email cej@jntuh.ac.in, or call 6302503548.",
  },
];

/* ── auth redirect ──────────────────────────────────────────────── */
function findAuthToken(
  store: Awaited<ReturnType<typeof cookies>>,
): string | null {
  const names = [
    "auth_token",
    "access_token",
    "token",
    "session",
    "jwt",
    "__Host-token",
    "__Secure-token",
  ];
  for (const n of names) {
    const v = store.get(n)?.value;
    if (v) return v;
  }
  for (const c of store.getAll()) {
    if (c.name.toLowerCase().includes("token") && c.value) return c.value;
  }
  return null;
}

async function resolveAuthRedirect(): Promise<string | null> {
  try {
    const store = await cookies();
    const token = findAuthToken(store);
    if (!token) return null;
    const auth = await createAuthContext(token);
    if (!auth.isAuthenticated || !auth.isActive) return null;
    return getDefaultRouteForRole(auth.role, auth.gateId);
  } catch {
    return null;
  }
}

/* ── page ───────────────────────────────────────────────────────── */
export default async function HomePage() {
  const redirectTo = await resolveAuthRedirect();
  if (redirectTo) redirect(redirectTo);

  return (
    <div data-home className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(FAQS)) }}
      />

      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-surface)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[var(--action-primary)]" />
            <div>
              <div className="text-sm font-semibold">JNTUH UCEJ</div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                Campus Access Portal
              </div>
            </div>
          </Link>
          <nav className="hidden items-center gap-4 text-sm md:flex">
            <Link href="/about" className="hover:text-[var(--action-primary)]">
              About
            </Link>
            <Link href="/help" className="hover:text-[var(--action-primary)]">
              Help
            </Link>
            <LiveStatePill />
            <Link
              href="/login"
              className="rounded-lg bg-[var(--action-primary)] px-4 py-2 font-semibold text-white hover:opacity-90"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--action-primary)]">
          Official portal · JNTUH UCEJ · Established 2007
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-tight md:text-6xl">
          JNTUH University College of Engineering Jagtial — Campus Access Portal
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-[var(--text-secondary)]">
          {COLLEGE.portalPurpose}
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-1">
            <Award className="h-3 w-3 text-[var(--action-primary)]" /> NAAC A+
            (CGPA 3.29)
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-1">
            <BookOpen className="h-3 w-3 text-[var(--action-primary)]" />
            Autonomous since 2023
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-1">
            <ShieldCheck className="h-3 w-3 text-[var(--action-primary)]" /> AICTE
            approved · UGC 2(f) &amp; 12(B)
          </span>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--action-primary)] px-5 py-3 font-semibold text-white hover:opacity-90"
          >
            <LogIn className="h-4 w-4" /> {COLLEGE.primaryCTA}
          </Link>
          <Link
            href="/help"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-5 py-3 font-semibold hover:bg-[var(--bg-elevated)]"
          >
            <HelpCircle className="h-4 w-4" /> {COLLEGE.secondaryCTA}
          </Link>
        </div>
        <div className="mt-10">
          <LiveStatsStrip />
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-surface)]/40">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-6 md:grid-cols-4">
          {[
            { icon: ShieldCheck, label: "Role-based access" },
            { icon: Lock, label: "MFA-ready sign-in" },
            { icon: FileCheck, label: "Full audit trail" },
            { icon: Clock, label: "24×7 campus records" },
          ].map((t) => (
            <div
              key={t.label}
              className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
            >
              <t.icon className="h-4 w-4 text-[var(--action-primary)]" />{" "}
              {t.label}
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold md:text-3xl">Who is this portal for?</h2>
        <p className="mt-2 max-w-2xl text-[var(--text-secondary)]">
          Every role on campus has a dedicated, permission-scoped dashboard.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((r) => (
            <Link
              key={r.label}
              href={r.href}
              className="group rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 transition hover:border-[var(--action-primary)] hover:shadow"
            >
              <r.icon className="h-6 w-6 text-[var(--action-primary)]" />
              <h3 className="mt-3 font-semibold">{r.label}</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{r.blurb}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--action-primary)] opacity-0 transition group-hover:opacity-100">
                Sign in <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Programmes — real UCEJ data */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-surface)]/30">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-bold md:text-3xl">
            Programmes offered at JNTUH UCEJ
          </h2>
          <p className="mt-2 text-[var(--text-secondary)]">
            Five UG and five PG programmes across engineering disciplines.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
              <h3 className="font-semibold">Undergraduate — B.Tech</h3>
              <ul className="mt-3 space-y-1 text-sm text-[var(--text-secondary)]">
                {UG_PROGRAMMES.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
              <h3 className="font-semibold">Postgraduate — M.Tech</h3>
              <ul className="mt-3 space-y-1 text-sm text-[var(--text-secondary)]">
                {PG_PROGRAMMES.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How campus access works */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold md:text-3xl">How campus access works</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-4">
          {FLOW_STEPS.map((s, i) => (
            <div
              key={s.title}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5"
            >
              <div className="text-3xl font-bold text-[var(--action-primary)]">
                {i + 1}
              </div>
              <h3 className="mt-2 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-surface)]/30">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-bold md:text-3xl">Security and privacy</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {SECURITY_POINTS.map((point) => (
              <div
                key={point}
                className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--action-primary)]" />
                <p className="text-sm text-[var(--text-secondary)]">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Campus / contact — real address */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold md:text-3xl">Campus and contact</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
            <MapPin className="h-5 w-5 text-[var(--action-primary)]" />
            <h3 className="mt-2 font-semibold">Address</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {COLLEGE.addressLine1}
              <br />
              {COLLEGE.addressLine2}, {COLLEGE.city}
              <br />
              {COLLEGE.state} – {COLLEGE.pincode}, India
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
            <Mail className="h-5 w-5 text-[var(--action-primary)]" />
            <h3 className="mt-2 font-semibold">Email</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {COLLEGE.email}
              <br />
              {COLLEGE.emailAlt}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
            <Phone className="h-5 w-5 text-[var(--action-primary)]" />
            <h3 className="mt-2 font-semibold">Phone</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {COLLEGE.phone}
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-surface)]/30">
        <div className="mx-auto max-w-4xl px-4 py-14">
          <h2 className="text-2xl font-bold md:text-3xl">
            Frequently asked questions
          </h2>
          <div className="mt-6 divide-y divide-[var(--border)]">
            {FAQS.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none font-semibold">
                  {f.q}
                </summary>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-14 text-center">
        <h2 className="text-2xl font-bold md:text-3xl">Ready to sign in?</h2>
        <p className="mt-2 text-[var(--text-secondary)]">
          Use the campus account issued by your department or administrator.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--action-primary)] px-6 py-3 font-semibold text-white hover:opacity-90"
        >
          <LogIn className="h-4 w-4" /> {COLLEGE.primaryCTA}
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--bg-surface)]/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
          <div>
            <div className="text-sm font-semibold">{COLLEGE.officialName}</div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              {COLLEGE.addressLine1}, {COLLEGE.addressLine2}
              <br />
              {COLLEGE.city}, {COLLEGE.state} {COLLEGE.pincode}
            </div>
          </div>
          <div className="text-sm">
            <div className="font-semibold">Portal</div>
            <ul className="mt-2 space-y-1 text-[var(--text-muted)]">
              <li>
                <Link href="/about" className="hover:text-[var(--action-primary)]">
                  About
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-[var(--action-primary)]">
                  Help &amp; FAQ
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[var(--action-primary)]">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
          <div className="text-sm">
            <div className="font-semibold">Contact</div>
            <ul className="mt-2 space-y-1 text-[var(--text-muted)]">
              <li>Email: {COLLEGE.email}</li>
              <li>Alternate: {COLLEGE.emailAlt}</li>
              <li>Phone: {COLLEGE.phone}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[var(--border)] py-4 text-center text-xs text-[var(--text-muted)]">
          © {new Date().getFullYear()} {COLLEGE.officialName}. All rights
          reserved.
        </div>
      </footer>
    </div>
  );
}
