import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, LifeBuoy } from "lucide-react";
import { COLLEGE } from "@/lib/college-config";
import {
  buildPageMetadata,
  breadcrumbJsonLd,
  faqJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Help & FAQ",
  description: `Sign-in help, account recovery, role services and support contacts for the ${COLLEGE.officialName} campus portal.`,
  path: "/help",
});

const FAQS = [
  {
    q: "How do I sign in to the JNTUH UCEJ campus portal?",
    a: "Use the Sign in button on the homepage. Enter the campus account issued by your department or the administrator. Students, parents, faculty, staff and administrators each have a dedicated dashboard.",
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
    a: "Nachupally (Kondagattu), Kodimial Mandal, Jagtial District, Telangana – 505 501, India.",
  },
  {
    q: "How do I get a gate pass?",
    a: "Raise a permission request from your student dashboard. The request goes through the correct approval chain (caretaker, warden, HOD or principal as applicable) and generates a QR pass on approval.",
  },
  {
    q: "How long does approval take?",
    a: "Routine hostel requests are normally decided within the same day. Multi-day leave, exam and memo workflows may take longer depending on the approver stage.",
  },
  {
    q: "Who do I contact for help?",
    a: "Use the Support page after signing in, or contact the college office at cej@jntuh.ac.in or +91 6302503548.",
  },
];

export default function HelpPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Help", path: "/help" },
  ]);
  const faqLd = faqJsonLd(FAQS);

  return (
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-12 text-[var(--text-primary)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--action-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>

      <h1 className="mt-6 text-3xl font-bold md:text-4xl">
        Help &amp; Frequently Asked Questions
      </h1>
      <p className="mt-3 text-[var(--text-secondary)]">
        Sign-in help, account recovery, and support contacts for the{" "}
        {COLLEGE.officialName} campus portal.
      </p>

      <section className="mt-8 divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {FAQS.map((f) => (
          <details key={f.q} className="py-4">
            <summary className="cursor-pointer list-none font-semibold">
              {f.q}
            </summary>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{f.a}</p>
          </details>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <LifeBuoy className="h-5 w-5 text-[var(--action-primary)]" /> Contact
          support
        </h2>
        <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-[var(--action-primary)]" />
            <a href={`mailto:${COLLEGE.email}`} className="hover:underline">
              {COLLEGE.email}
            </a>
            <span className="text-[var(--text-muted)]">·</span>
            <a href={`mailto:${COLLEGE.emailAlt}`} className="hover:underline">
              {COLLEGE.emailAlt}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-[var(--action-primary)]" />
            <a href={`tel:+91${COLLEGE.phone}`} className="hover:underline">
              +91 {COLLEGE.phone}
            </a>
          </div>
        </div>
      </section>

      <div className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 text-sm">
        <strong>Already signed in?</strong>
        <p className="mt-1 text-[var(--text-secondary)]">
          Use the in-app{" "}
          <Link href="/support" className="text-[var(--action-primary)] underline">
            Support
          </Link>{" "}
          page to raise a ticket.
        </p>
      </div>
    </main>
  );
}
