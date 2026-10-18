// src/components/marketing/BreadcrumbJsonLd.tsx
//
// BreadcrumbList JSON-LD for Google rich results.
// Server component, no deps.

import { SITE } from "@/lib/seo/site-config";

export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; path: string }[];
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE.url}${item.path}`,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default BreadcrumbJsonLd;
