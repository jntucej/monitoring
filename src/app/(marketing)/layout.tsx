// src/app/(marketing)/layout.tsx
//
// Shared chrome for every public / marketing page.
// Wraps the landing page + /features + /trust + /about + /contact + /privacy + /terms.
// No client JS — pure server rendering.

import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { PlausibleScript } from "@/components/analytics/PlausibleScript";
import { SITE } from "@/lib/seo/site-config";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  alternates: { canonical: SITE.url + "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    url: SITE.url + "/",
    images: [
      {
        url: "/og-marketing.png",
        width: 1200,
        height: 630,
        alt: `${SITE.name} — campus access platform`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@gate_monitor",
    creator: "@gate_monitor",
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <PlausibleScript />
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
