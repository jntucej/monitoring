import Link from "next/link";
import type { Metadata } from "next";
import {
  buildPageMetadata,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import { COLLEGE } from "@/lib/college-config";
import { HomeRoot } from "./components/HomeRoot";
import { Hero } from "./components/sections/Hero";
import { LiveCountsStrip } from "./components/sections/LiveCountsStrip";
import { RoleMap } from "./components/sections/RoleMap";
import { AccessFlow } from "./components/sections/AccessFlow";
import { Modules } from "./components/sections/Modules";
import { TrustBand } from "./components/sections/TrustBand";
import { SystemHealthSection } from "./components/sections/SystemHealthSection";
import { NumbersBand } from "./components/sections/NumbersBand";
import { CTASection } from "./components/sections/CTASection";
import { HomeFooter } from "./components/sections/HomeFooter";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import "./home.css";

export const metadata: Metadata = buildPageMetadata({
  title: `Official Campus Portal | ${COLLEGE.officialName}`,
  description: COLLEGE.portalPurpose,
  path: "/",
});

/* ── page ─────────────────────────────────────────────────────────── */
// The auth redirect now lives in `src/proxy.ts` (edge runtime), which keeps
// the home page fully static: the CDN caches the HTML and serves it instantly
// to anonymous visitors, and logged-in users are bounced to their role console
// before routing. No `cookies()` call here means Next can prerender `/`.
export const dynamic = "force-static";
// ISR safety net in case the static shell ever needs refreshing.
export const revalidate = 3600;

export default function HomePage() {
  return (
    <HomeRoot>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
      />

      <Hero />

      <WidgetBoundary>
        <LiveCountsStrip />
      </WidgetBoundary>

      <RoleMap />
      <AccessFlow />
      <Modules />
      <TrustBand />
      <SystemHealthSection />
      <NumbersBand />
      <CTASection />
      <HomeFooter />
    </HomeRoot>
  );
}
