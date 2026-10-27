<<<<<<< HEAD
'use client';
export const dynamic = "force-dynamic";

import React from 'react';
import Link from 'next/link';
import { useCollegeInfo } from '@/hooks/useCollegeInfo';
=======
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
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31

export default function AboutPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
  ]);

  return (
<<<<<<< HEAD
    <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] p-6 md:p-12">
      <div className="max-w-3xl mx-auto glass-card p-8 rounded-3xl border-slate-800/50">
        <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">About {college.name} Monitoring</p>
        <div className="space-y-4 text-[var(--text-secondary)]">
          <p>
            Welcome to the {college.name} Gate Monitoring System. This platform provides real-time oversight of campus mobility, enhancing security and operational efficiency for students, faculty, and administration.
          </p>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] pt-4">Legal & Privacy</h2>
          <p>
            {college.accreditation} • {college.principal}
          </p>
          <p>
            {college.address}
          </p>
          <p>
            Our commitment to data privacy is paramount. This system complies with modern security standards to ensure student and staff records are handled securely.
          </p>
          <div className="pt-6">
            <Link href="/" className="inline-block px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-medium transition">
              Back to Home
            </Link>
=======
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
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
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
