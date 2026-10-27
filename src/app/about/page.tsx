export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Mail,
  Phone,
  Award,
  BookOpen,
  Building2,
  Users,
} from "lucide-react";
import { COLLEGE } from "@/lib/college-config";
import {
  buildPageMetadata,
  breadcrumbJsonLd,
  organizationJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "About the Campus Portal",
  description: `About the official campus portal of ${COLLEGE.officialName} — history, programmes, accreditation and portal services.`,
  path: "/about",
});

const UG = [
  "B.Tech — Electrical & Electronics Engineering (EEE)",
  "B.Tech — Mechanical Engineering (ME)",
  "B.Tech — Electronics & Communication Engineering (ECE)",
  "B.Tech — Computer Science & Engineering (CSE)",
  "B.Tech — Information Technology (IT)",
];

const PG = [
  "M.Tech — Electrical Power Systems (EEE)",
  "M.Tech — Engineering Design (ME)",
  "M.Tech — Digital Systems & Computer Electronics (ECE)",
  "M.Tech — Computer Science & Engineering (CSE)",
  "M.Tech — Cyber Security (new from 2024-25)",
];

export default function AboutPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
  ]);

  return (
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-12 text-[var(--text-primary)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--action-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>

      <h1 className="mt-6 text-3xl font-bold md:text-4xl">
        About {COLLEGE.officialName}
      </h1>
      <p className="mt-4 text-[var(--text-secondary)]">
        {COLLEGE.officialName} ({COLLEGE.shortName}) was established in{" "}
        {COLLEGE.establishedYear} as a constituent college of Jawaharlal Nehru
        Technological University Hyderabad. It is an autonomous institution
        approved by AICTE, recognised by UGC under Section 2(f) and 12(B), and
        accredited by NAAC with an A+ grade.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Award className="h-5 w-5 text-[var(--action-primary)]" /> Accreditation
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
          <li>
            <strong>NAAC:</strong> A+ grade, CGPA 3.29 (2022)
          </li>
          <li>
            <strong>NBA:</strong> UG programmes in EEE, ME and CSE accredited
          </li>
          <li>
            <strong>AICTE:</strong> Approved
          </li>
          <li>
            <strong>UGC:</strong> Recognised under 2(f) and 12(B)
          </li>
          <li>
            <strong>Status:</strong> {COLLEGE.affiliation}
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[var(--action-primary)]" /> Programmes
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
            <h3 className="font-semibold">B.Tech</h3>
            <ul className="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
              {UG.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
            <h3 className="font-semibold">M.Tech</h3>
            <ul className="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
              {PG.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[var(--action-primary)]" /> Campus
        </h2>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          The campus is located at Nachupally (Kondagattu), Kodimial Mandal,
          Jagtial District, Telangana. Approximately 90% of students reside in
          campus hostels, with dedicated boys and girls hostel blocks managed
          by the hostel administration.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-[var(--action-primary)]" /> What the
          portal does
        </h2>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          This portal records campus movement, processes permission and gate-pass
          requests through a defined approval chain, and gives each role access to
          only the data it is authorised for. All actions are audit-logged.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Contact</h2>
        <div className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--action-primary)]" />
            <span>
              {COLLEGE.addressLine1}, {COLLEGE.addressLine2},
              <br />
              {COLLEGE.city}, {COLLEGE.state} – {COLLEGE.pincode}, India
            </span>
          </div>
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
        <strong className="block">Need help?</strong>
        <p className="mt-1 text-[var(--text-secondary)]">
          Visit the{" "}
          <Link href="/help" className="text-[var(--action-primary)] underline">
            Help &amp; FAQ
          </Link>{" "}
          page.
        </p>
      </div>
    </main>
  );
}
