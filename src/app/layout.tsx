import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { COLLEGE } from "@/lib/college-config";
import { organizationJsonLd } from "@/lib/seo";
import { ClientProviders } from "./ClientProviders";
import { PwaInstallPrompt } from "@/components/shared/PwaInstallPrompt";

export const metadata: Metadata = {
  metadataBase: new URL(COLLEGE.baseUrl),
  title: {
    default: `${COLLEGE.officialName} Campus Access Portal`,
    template: `%s | ${COLLEGE.shortName}`,
  },
  description: COLLEGE.portalPurpose,
  applicationName: `${COLLEGE.shortName} Campus Portal`,
  keywords: [
    "JNTUH UCEJ",
    "JNTUCEJ",
    "JNTUH University College of Engineering Jagtial",
    "JNTUH UCEJ",
    "JNTUH College of Engineering Jagtial",
    "JNTU College of Engineering Jagtial",
    "campus portal Jagtial",
    "gate pass JNTUH UCEJ",
    "student portal JNTUH UCEJ",
    "parent portal JNTUH UCEJ",
  ],
  authors: [{ name: COLLEGE.officialName }],
  creator: COLLEGE.officialName,
  publisher: COLLEGE.officialName,
  alternates: { canonical: COLLEGE.baseUrl },
  openGraph: {
    type: "website",
    siteName: COLLEGE.shortName,
    url: COLLEGE.baseUrl,
    title: `${COLLEGE.officialName} Campus Access Portal`,
    description: COLLEGE.portalPurpose,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: `${COLLEGE.officialName} Campus Access Portal`,
    description: COLLEGE.portalPurpose,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/icon", sizes: "any", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon",
  },
  verification: {
    google: "pUsD_GnlIE8aG5lekStc6zJ3BYyZ1iZNGLjQ2rWeRlU",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "var(--color-surface)" },
    { media: "(prefers-color-scheme: dark)", color: "var(--bg-base)" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // L2: Force dynamic rendering so Next.js extracts the per-request CSP
  // nonce from the x-nonce request header set by the edge middleware.
  // Without this, static/prerendered pages ship a fixed nonce and
  // 'strict-dynamic' blocks every dynamically-imported chunk.
  await headers();
  // The edge middleware stamps a per-request CSP nonce on the x-nonce
  // request header. Next.js SSR reads it back here so any inline script
  // carries the matching nonce; 'strict-dynamic' in the CSP header then
  // permits it without 'unsafe-inline'.
  //
  // NOTE: the S:0 streaming-wrapper unhide script was removed here.
  // Next.js wraps the client tree in <div hidden id="S:0"> during SSR
  // and unhides it on client hydration. A head-side inline script was
  // the previous workaround, but headless Chromium measures NO_FCP
  // against it (LCP never lands), which is a real LCP regression on
  // real devices too: content only appears after JS execution.
  // The correct fix is to keep the Suspense boundary but ensure the
  // server-rendered HTML of the home page paints without waiting for
  // hydration — i.e. move the Suspense wrapper out of the critical
  // path for marketing pages (already done in ClientProviders for
  // effectivePath marketing routes).
  const h = await headers();
  const nonce = h.get("x-nonce") ?? "";
  return (
    <html lang="en-IN">
      <head>
        {/*
          S:0 unhide: Next.js wraps the client tree in
          <div hidden id="S:0"> during SSR. The inline script below
          un-hides it immediately — it is NOT hydration-dependent.
          With strict-dynamic dropped, the response header CSP
          ('self' + nonce) allows external chunks. The inline script
          needs 'unsafe-inline' — add it to the CSP fallback.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.addEventListener('DOMContentLoaded',function(){var s=document.getElementById('S:0');if(s)s.hidden=false;});`,
          }}
        />
        {/*
          CSP is served as a response header by the edge middleware, not
          as a meta tag. The header carries a fresh per-request nonce +
          strict-dynamic. A meta tag would be a decoy: when both are
          present the browser enforces the header, and the header's nonce
          never matches the nonce baked into the static HTML's script
          tags, so strict-dynamic blocks every chunk load.
        */}
        {/* JSON-LD blocks are data islands, not executable scripts: they are
          not affected by script-src, so no nonce is required. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd()),
          }}
        />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-action-primary focus:text-white focus:rounded focus:text-sm focus:font-medium"
        >
          Skip to main content
        </a>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-action-primary focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        <ClientProviders>{children}</ClientProviders>
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
