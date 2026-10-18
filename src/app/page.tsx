import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthContext } from "@/lib/authContext";
import { getDefaultRouteForRole } from "@/server/policy/routes";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Campus Access · Midnight Instrument",
  description:
    "Every crossing, remembered. The gate monitor for JNTUCEJ — scans, passes, permissions, and the quiet signals of campus.",
  openGraph: {
    title: "Campus Access · Midnight Instrument",
    description: "Every crossing, remembered. The campus breathes. We listen.",
    type: "website",
  },
};

export default async function RootPage() {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("access_token")?.value ??
    cookieStore.get("auth_token")?.value ??
    cookieStore.get("token")?.value;

  let dest: string | null = null;
  if (token) {
    try {
      const auth = await createAuthContext(token);
      if (auth?.isAuthenticated) {
        dest = getDefaultRouteForRole(auth.role, auth.gateId);
      }
    } catch {
      // Invalid / expired token → fall through to the landing.
    }
  }

  // Keep redirect() OUTSIDE the try — it throws NEXT_REDIRECT internally.
  if (dest) redirect(dest);

  return <LandingPage />;
}
