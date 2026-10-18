// src/app/(marketing)/layout.tsx
//
// Shared chrome for every public / marketing page.
// Wraps the landing page + /features + /trust + /about + /contact + /privacy + /terms.
// No client JS — pure server rendering.

import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { SITE } from "@/lib/seo/site-config";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  alternates: { canonical: SITE.url + "/" },
  robots: { index: true, follow: true },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
