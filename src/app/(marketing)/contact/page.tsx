// src/app/(marketing)/contact/page.tsx
//
// Conversion page. Uses mailto deep-links so no backend is needed.
// Swap for a /api/public/contact endpoint when ready.

import type { Metadata } from "next";
import { Mail, MapPin, Clock, ArrowRight, ExternalLink } from "lucide-react";
import { SITE } from "@/lib/seo/site-config";
import { PageHero } from "@/components/marketing/PageHero";
import { BreadcrumbJsonLd } from "@/components/marketing/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "Contact | Gate Monitor",
  description:
    "Book a demo, request a security pack, or ask about institutional licensing for Gate Monitor campus access management.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact | Gate Monitor",
    description: "Get in touch with the team behind Gate Monitor.",
    url: `${SITE.url}/contact`,
  },
};

const ROUTES = [
  {
    label: "Book a demo",
    subject: "Campus walkthrough request",
    body: "Hi team,%0A%0AWe'd like a walkthrough of Gate Monitor for our institution.%0A%0AInstitution:%0AYour name:%0ARole:%0AExpected campus size:%0A%0AThanks.",
    icon: ArrowRight,
    note: "Walkthrough with the team, typically within 1 business day.",
  },
  {
    label: "Security questionnaire",
    subject: "Security questionnaire request",
    body: "Hi team,%0A%0AOur procurement team would like a security questionnaire and DPA for review.%0A%0AInstitution:%0AYour name:%0ARole:%0A%0AThanks.",
    icon: ExternalLink,
    note: "Full security pack: controls list, data flow, DPA template.",
  },
  {
    label: "Technical questions",
    subject: "Technical question about Gate Monitor",
    body: "Hi team,%0A%0AQuestion:%0A%0AInstitution:%0AYour name:%0A%0AThanks.",
    icon: Mail,
    note: "Architecture, integrations, self-hosting, migration from legacy.",
  },
  {
    label: "Support (existing users)",
    subject: "",
    icon: ArrowRight,
    note: "If you already have an account, sign in and use the in-app Help & Support.",
    href: "/help",
    body: "",
  },
];

export default function ContactPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ]}
      />
      <PageHero
        eyebrow="Contact"
        title="Let's talk about your campus."
        lede="Whether you're exploring, comparing options, or ready to sign — the team that builds Gate Monitor also runs it on a real campus. We'll answer directly."
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Contact", href: "/contact" },
        ]}
      />

      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-20 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:gap-12 lg:px-8">
          {/* Contact routes */}
          <div className="space-y-4">
            {ROUTES.map((r) => {
              const href =
                "href" in r && r.href
                  ? r.href
                  : `mailto:${SITE.college.email}?subject=${encodeURIComponent(
                      r.subject,
                    )}&body=${r.body}`;
              return (
                <a
                  key={r.label}
                  href={href}
                  className="group block rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-emerald-300 hover:bg-emerald-50/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        {r.label}
                      </h2>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                        {r.note}
                      </p>
                    </div>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-emerald-100 group-hover:text-emerald-700">
                      <r.icon className="h-4 w-4" />
                    </span>
                  </div>
                </a>
              );
            })}
          </div>

          {/* Institution info */}
          <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-sm font-semibold text-slate-900">Institution</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {SITE.college.name}
            </p>
            <ul className="mt-5 space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>{SITE.college.address}</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <a
                  href={`mailto:${SITE.college.email}`}
                  className="hover:text-slate-900"
                >
                  {SITE.college.email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <a
                  href={SITE.college.website}
                  className="hover:text-slate-900"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {SITE.college.website}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>Response within 1 business day</span>
              </li>
            </ul>
          </aside>
        </div>
      </section>
    </>
  );
}
