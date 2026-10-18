// src/app/(marketing)/privacy/page.tsx
//
// Privacy policy. Structural template — have a qualified professional review
// against the DPDP Act 2023 and your jurisdiction before publishing.
// NOT legal advice.

import type { Metadata } from "next";
import { SITE } from "@/lib/seo/site-config";
import { PageHero } from "@/components/marketing/PageHero";
import { BreadcrumbJsonLd } from "@/components/marketing/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "Privacy policy | Gate Monitor",
  description:
    "How Gate Monitor collects, uses, and protects personal data in accordance with India's Digital Personal Data Protection Act 2023.",
  alternates: { canonical: "/privacy" },
};

const SECTIONS = [
  {
    id: "scope",
    title: "1. Scope",
    body: [
      `This privacy policy applies to ${SITE.name}, operated by ${SITE.college.name} ("we", "us"), and to any institution that deploys the platform ("Customer"). It describes how personal data of students, guardians, faculty, staff, and operators is collected, used, stored, and deleted.`,
      "Each institutional Customer acts as the Data Fiduciary under India's Digital Personal Data Protection Act 2023 (the \"DPDP Act\"). Gate Monitor acts as the Data Processor on the Customer's instructions.",
    ],
  },
  {
    id: "data-collected",
    title: "2. Data we collect",
    body: [
      "Account data: name, email, phone, role, roll or employee identifier, department or hostel affiliation.",
      "Movement data: gate and hostel scan records (timestamp, direction, gate, operator), pass application and approval history.",
      "Optional biometric data: one-way hashes of thumbprint or face templates. Raw biometric samples never leave the capture device.",
      "Consent records: purpose, scope, version, and timestamp of every consent granted or revoked.",
      "Audit data: every administrative action with actor, role, timestamp, and details.",
    ],
  },
  {
    id: "use",
    title: "3. How we use data",
    body: [
      "To record and display authorized campus movement to the correct role (the student, their guardian, and the approving staff).",
      "To route permission requests through their configured approval chain.",
      "To generate reports and analytics for authorized administrators.",
      "To meet legal, audit, or regulatory obligations applicable to the Customer.",
      "We do not use student data for advertising, profiling, or any purpose unrelated to campus access operations.",
    ],
  },
  {
    id: "consent",
    title: "4. Consent",
    body: [
      "Consent is captured at account creation and re-captured whenever its scope or version changes.",
      "Consent is per-purpose: a guardian may consent to movement notifications but decline marketing emails.",
      "Consent can be withdrawn at any time from the account settings. Withdrawal does not affect prior processing.",
    ],
  },
  {
    id: "rights",
    title: "5. Your rights",
    body: [
      "Under the DPDP Act you have the right to access, correct, and request erasure of your personal data.",
      "You have the right to nominate another individual to exercise your rights in case of death or incapacity.",
      "You have the right to grievance redressal. Contact the Grievance Officer listed below.",
    ],
  },
  {
    id: "retention",
    title: "6. Retention",
    body: [
      "Data is retained for the minimum period required to fulfil the operational, audit, and legal purposes described above.",
      "Institutional Customers configure retention windows per data category. Audit logs are typically retained for seven years to support institutional audits.",
      "On account deletion, personal data is either erased or irreversibly anonymized. Aggregated statistics may be retained.",
    ],
  },
  {
    id: "security",
    title: "7. Security",
    body: [
      "Row-level security is enforced at the database layer. Every role can only see data it has been explicitly granted.",
      "Privileged accounts require multi-factor authentication. Sessions are force-revocable.",
      "Every state change is written to an immutable audit log.",
      "See the Security & Trust page for the full technical controls list.",
    ],
  },
  {
    id: "third-parties",
    title: "8. Third parties",
    body: [
      "We do not sell personal data. We do not share personal data with advertising networks or data brokers.",
      "Sub-processors (e.g. infrastructure hosting, email delivery, SMS gateway) are listed in the Customer's data processing agreement and receive only what is strictly necessary.",
      "Institutional Customers configure which sub-processors are enabled for their deployment.",
    ],
  },
  {
    id: "grievance",
    title: "9. Grievance officer",
    body: [
      `For any question, grievance, or request under the DPDP Act, contact: ${SITE.college.email}.`,
      "The Grievance Officer responds within 30 days of receipt.",
    ],
  },
  {
    id: "changes",
    title: "10. Changes",
    body: [
      "Material changes to this policy will be communicated to institutional Customers in advance and reflected in the version history.",
      "Continued use after a material change constitutes acceptance of the updated policy.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Privacy", path: "/privacy" },
        ]}
      />
      <PageHero
        eyebrow="Legal"
        title="Privacy policy"
        lede="How Gate Monitor collects, uses, and protects personal data in accordance with India's Digital Personal Data Protection Act 2023."
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Privacy", href: "/privacy" },
        ]}
      />
      <article className="bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-sm text-slate-500">
            Last updated:{" "}
            {new Date().toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <div className="mt-10 space-y-10">
            {SECTIONS.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="text-xl font-semibold text-slate-900">
                  {s.title}
                </h2>
                <div className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-600">
                  {s.body.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </article>
    </>
  );
}
