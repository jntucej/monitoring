import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import {
  ShieldCheck,
  Users,
  Briefcase,
  Building2,
  Crown,
  ScanLine,
  Settings,
  Server,
  LogIn,
  ArrowRight,
} from "lucide-react";
import { createAuthContext } from "@/lib/authContext";
import { getDefaultRouteForRole } from "@/server/policy/routes";
import { LiveStatsStrip } from "./LiveStatsStrip";
import { COLLEGE } from "@/lib/college-config";
import {
  buildPageMetadata,
  organizationJsonLd,
  websiteJsonLd,
  faqJsonLd,
} from "@/lib/seo";
import {
  KineticTypography,
  ScrambleText,
  BlurReveal,
  PhysicsCard,
  MagneticButton,
} from "@/app/(home)/components/ui/index";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { HomeMotionLayer } from "./HomeMotionLayer";

export const metadata: Metadata = buildPageMetadata({
  title: `Official Campus Portal | ${COLLEGE.officialName}`,
  description: COLLEGE.portalPurpose,
  path: "/",
});

// The auth-redirect check is wrapped in Suspense (see AuthRedirect below), so
// the SEO content can be statically cached and served instantly to anonymous
// visitors. `auto` lets Next cache the static shell while only the small
// auth-check Suspense boundary stays dynamic.
export const dynamic = "auto";

/* ── role list ────────────────────────────────────────────────────── */
const ROLES = [
  {
    label: "Students",
    href: "/login?role=student",
    icon: Crown as typeof ShieldCheck,
    blurb: "Digital ID, gate passes, permissions, attendance and mess services.",
  },
  {
    label: "Parents & Guardians",
    href: "/login?role=parent",
    icon: Users as typeof ShieldCheck,
    blurb: "Child status, movement timeline, pass requests and notifications.",
  },
  {
    label: "Faculty",
    href: "/login?role=faculty",
    icon: Briefcase as typeof ShieldCheck,
    blurb: "Class attendance, subject permissions and student directory.",
  },
  {
    label: "Hostel Staff",
    href: "/login?role=hostel-manager",
    icon: Building2 as typeof ShieldCheck,
    blurb: "Outpass approvals, room allocation, resident tickets.",
  },
  {
    label: "Gate Operators",
    href: "/login?role=operator",
    icon: ScanLine as typeof ShieldCheck,
    blurb: "Scan verification, manual entry, transactions.",
  },
  {
    label: "Administration",
    href: "/login?role=admin",
    icon: Settings as typeof ShieldCheck,
    blurb: "Approval centre, audit, department analytics, oversight.",
  },
];

/* ── verified FAQ content ────────────────────────────────────────── */
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
    a: "JNTUH University College of Engineering Jagtial is at Nachupally (Kondagattu), Kodimial Mandal, Jagtial District, Telangana – 505501, India.",
  },
  {
    q: "Who do I contact for help?",
    a: "Use the Help & Support page, email cej@jntuh.ac.in, or call 6302503548.",
  },
];

/* ── auth redirect check (dynamic, Suspense-wrapped) ─────────────── */
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

async function AuthRedirect() {
  const redirectTo = await resolveAuthRedirect();
  if (redirectTo) redirect(redirectTo);
  return null;
}

/* ── page ─────────────────────────────────────────────────────────── */
export default async function HomePage() {
  return (
    <div data-home className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <Suspense fallback={null}>
        <AuthRedirect />
      </Suspense>
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
            <Link
              href="/login"
              className="rounded-lg bg-[var(--action-primary)] px-4 py-2 font-semibold text-[var(--bg-base)] hover:opacity-90"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero — centered, kinetic reveal */}
      <section className="relative flex flex-col items-center justify-center px-4 py-20 text-center">
        <KineticTypography
          as="h1"
          text="JNTUH UCEJ"
          className="text-5xl font-semibold tracking-tight md:text-7xl"
        />
        <ScrambleText
          text="Campus Access Portal"
          className="mt-3 text-sm md:text-base uppercase tracking-[0.35em] text-[var(--action-primary)]"
        />
        <p className="mt-6 max-w-2xl text-lg text-[var(--text-secondary)]">
          {COLLEGE.portalPurpose}
        </p>

        <BlurReveal delay={0.15} className="mt-10 w-full">
          <WidgetBoundary>
            <LiveStatsStrip />
          </WidgetBoundary>
        </BlurReveal>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <MagneticButton
            onClick={() => (window.location.href = "/login")}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--action-primary)] px-5 py-3 font-semibold text-[var(--bg-base)] hover:opacity-90"
          >
            <LogIn className="h-4 w-4" />
            {COLLEGE.primaryCTA}
          </MagneticButton>
          <Link
            href="/help"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-5 py-3 font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
          >
            {COLLEGE.secondaryCTA}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Roles — physics cards */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="text-center">
          <h2 className="text-2xl font-bold md:text-3xl">Who is this portal for?</h2>
          <p className="mt-2 text-[var(--text-secondary)]">
            Every role on campus has a dedicated, permission-scoped dashboard.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((r) => (
            <PhysicsCard
              key={r.label}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5"
            >
              <Link href={r.href} className="group block">
                <r.icon className="h-6 w-6 text-[var(--action-primary)]" />
                <h3 className="mt-3 font-semibold">{r.label}</h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{r.blurb}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--action-primary)] opacity-0 transition group-hover:opacity-100">
                  Sign in
                  <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </PhysicsCard>
          ))}
        </div>
      </section>

      {/* Cinematic motion layer — lazy-loaded so it stays off first-load JS */}
      <HomeMotionLayer faqItems={FAQS} />

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--bg-surface)]/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-xs text-[var(--text-muted)]">
          <div>
            © {new Date().getFullYear()} {COLLEGE.officialName}
          </div>
          <nav className="flex gap-4">
            <Link href="/about" className="hover:text-[var(--action-primary)]">
              About
            </Link>
            <Link href="/help" className="hover:text-[var(--action-primary)]">
              Help
            </Link>
            <Link href="/login" className="hover:text-[var(--action-primary)]">
              Sign in
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
