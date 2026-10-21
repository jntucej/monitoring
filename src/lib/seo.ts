import type { Metadata } from "next";
import { COLLEGE, collegeCanonical } from "./college-config";

export interface PageSeoInput {
  title: string;
  description: string;
  path?: string;
  noindex?: boolean;
  image?: string;
}

export function buildPageMetadata(input: PageSeoInput): Metadata {
  const canonical = collegeCanonical(input.path ?? "/");
  const image = input.image ?? `${COLLEGE.baseUrl}/opengraph-image`;
  const title = `${input.title} | ${COLLEGE.shortName}`;
  return {
    title,
    description: input.description,
    alternates: { canonical },
    robots: input.noindex
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: COLLEGE.officialName,
      title,
      description: input.description,
      images: [{ url: image, width: 1200, height: 630, alt: COLLEGE.officialName }],
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: input.description,
      images: [image],
    },
  };
}

export const NOINDEX_METADATA: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-image-preview": "none",
      "max-snippet": 0,
    },
  },
};

/* ── JSON-LD ───────────────────────────────────────────────────── */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "CollegeOrUniversity",
    name: COLLEGE.officialName,
    alternateName: [COLLEGE.shortName, ...COLLEGE.alternateNames],
    url: COLLEGE.baseUrl,
    logo: `${COLLEGE.baseUrl}${COLLEGE.logoPath}`,
    email: COLLEGE.email,
    telephone: `+91-${COLLEGE.phone}`,
    foundingDate: COLLEGE.establishedYear,
    address: {
      "@type": "PostalAddress",
      streetAddress: `${COLLEGE.addressLine1}, ${COLLEGE.addressLine2}`,
      addressLocality: COLLEGE.city,
      addressRegion: COLLEGE.state,
      postalCode: COLLEGE.pincode,
      addressCountry: COLLEGE.country,
    },
    parentOrganization: {
      "@type": "CollegeOrUniversity",
      name: "Jawaharlal Nehru Technological University Hyderabad",
      url: "https://www.jntuh.ac.in/",
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: `${COLLEGE.officialName} Campus Portal`,
    alternateName: [COLLEGE.shortName, "JNTUCEJ"],
    url: COLLEGE.baseUrl,
    inLanguage: "en-IN",
    publisher: {
      "@type": "CollegeOrUniversity",
      name: COLLEGE.officialName,
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: collegeCanonical(it.path),
    })),
  };
}

export function faqJsonLd(faqs: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
