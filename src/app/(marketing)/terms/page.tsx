// src/app/(marketing)/terms/page.tsx
//
// Terms of service. Structural template — have a qualified professional review
// before publishing. NOT legal advice.

import type { Metadata } from "next";
import { SITE } from "@/lib/seo/site-config";
import { PageHero } from "@/components/marketing/PageHero";
import { BreadcrumbJsonLd } from "@/components/marketing/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "Terms of service | Gate Monitor",
  description:
    "Terms governing use of Gate Monitor campus access management, operated by JNTU College of Engineering Jagtial.",
  alternates: { canonical: "/terms" },
};

const SECTIONS = [
  {
    id: "acceptance",
    title: "1. Acceptance",
    body: [
      `By accessing ${SITE.name} or using any of its services, you agree to these terms. If you are using the platform on behalf of an institution, you represent that you are authorized to bind that institution.`,
    ],
  },
  {
    id: "accounts",
    title: "2. Accounts",
    body: [
      "You must provide accurate information and keep your credentials confidential.",
      "Accounts are provisioned by your institution's administrator. You do not own your account and it may be disabled when your affiliation ends.",
      "You are responsible for all activity that occurs under your account.",
    ],
  },
  {
    id: "use",
    title: "3. Acceptable use",
    body: [
      "You may use the platform only for the campus-access and student-safety purposes for which it was provided.",
      "You must not attempt to access accounts, data, or systems you are not authorized to access.",
      "You must not upload malware, attempt to disrupt service, or reverse-engineer the platform.",
      "You must not use the platform to surveil, harass, or discriminate against any individual.",
    ],
  },
  {
    id: "ip",
    title: "4. Intellectual property",
    body: [
      `The platform and its source code, design, and documentation are owned by ${SITE.college.name} and its licensors.`,
      "You are granted a limited, non-exclusive, non-transferable license to use the platform for your institution's internal purposes.",
      "Institutional data belongs to the institution; you grant us the license required to operate the platform on your behalf.",
    ],
  },
  {
    id: "warranty",
    title: "5. Disclaimers and limitation of liability",
    body: [
      'The platform is provided on an "as is" basis. To the extent permitted by law, we disclaim all implied warranties, including merchantability, fitness for a particular purpose, and non-infringement.',
      `To the extent permitted by law, ${SITE.college.name} is not liable for indirect, incidental, or consequential damages arising from use of the platform.`,
      "Nothing in these terms limits liability that cannot be limited under applicable Indian law.",
    ],
  },
  {
    id: "termination",
    title: "6. Termination",
    body: [
      "You may terminate your account by contacting your institution's administrator.",
      "We may suspend or terminate access for material breach of these terms, non-payment, or required legal compliance.",
      "On termination, your right to use the platform ends immediately. Institutional data is handled per the data processing agreement.",
    ],
  },
  {
    id: "changes",
    title: "7. Changes",
    body: [
      "We may update these terms from time to time. Material changes will be communicated to institutional Customers in advance.",
      "Continued use after a material change constitutes acceptance of the updated terms.",
    ],
  },
  {
    id: "law",
    title: "8. Governing law",
    body: [
      `These terms are governed by the laws of India. The courts at ${SITE.college.address.split(", ").pop() || "Hyderabad"}, Telangana, have exclusive jurisdiction over any dispute.`,
      `For any question about these terms, contact: ${SITE.college.email}.`,
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Terms", path: "/terms" },
        ]}
      />
      <PageHero
        eyebrow="Legal"
        title="Terms of service"
        lede="The agreement between you and the operators of Gate Monitor for the use of the campus access platform."
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Terms", href: "/terms" },
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
