import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { createAuthContext } from "@/lib/authContext";
import { getDefaultRouteForRole } from "@/server/policy/routes";
import { COLLEGE } from "@/lib/college-config";
import {
  buildPageMetadata,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import { HomeRoot } from "./components/HomeRoot";
import { Hero } from "./components/sections/Hero";
import { LiveCountsStrip } from "./components/sections/LiveCountsStrip";
import { RoleMap } from "./components/sections/RoleMap";
import { AccessFlow } from "./components/sections/AccessFlow";
import { Modules } from "./components/sections/Modules";
import { TrustBand } from "./components/sections/TrustBand";
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

// The auth-redirect check is wrapped in Suspense (see AuthRedirect below), so
// the SEO content can be statically cached and served instantly to anonymous
// visitors. `auto` lets Next cache the static shell while only the small
// auth-check Suspense boundary stays dynamic.
export const dynamic = "auto";

/* ── auth redirect check (dynamic, Suspense-wrapped) ─────────────── */
function findAuthToken(
  store: Awaited<ReturnType<typeof cookies>>,
): string | null {
  const names = [
    "auth_token",
    "access_token",
    "token",
    "session",
    "jwt",
    "__Host-token",
    "__Secure-token",
  ];
  for (const n of names) {
    const v = store.get(n)?.value;
    if (v) return v;
  }
  for (const c of store.getAll()) {
    if (c.name.toLowerCase().includes("token") && c.value) return c.value;
  }
  return null;
}

async function resolveAuthRedirect(): Promise<string | null> {
  try {
    const store = await cookies();
    const token = findAuthToken(store);
    if (!token) return null;
    const auth = await createAuthContext(token);
    if (!auth.isAuthenticated || !auth.isActive) return null;
    return getDefaultRouteForRole(auth.role, auth.gateId);
  } catch {
    return null;
  }
}

async function AuthRedirect() {
  const redirectTo = await resolveAuthRedirect();
  if (redirectTo) redirect(redirectTo);
  return null;
}

/* ── page ─────────────────────────────────────────────────────────── */
export default async function HomePage() {
  return (
    <HomeRoot>
      <Suspense fallback={null}>
        <AuthRedirect />
      </Suspense>
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
      <NumbersBand />
      <CTASection />
      <HomeFooter />
    </HomeRoot>
  );
}
