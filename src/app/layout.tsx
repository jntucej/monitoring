import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { COLLEGE } from "@/lib/college-config";
import { organizationJsonLd } from "@/lib/seo";
import { ClientProviders } from "./ClientProviders";
import { PwaInstallPrompt } from "@/components/shared/PwaInstallPrompt";
import { getServerTheme } from "@/lib/theme-cookie";

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
    "JNTUH College of Engineering Jagtial",
    "JNTU College of Engineering Jagtial",
    "campus portal Jagtial",
    "gate pass JNTUH UCEJ",
    "student portal JNTUH UCEJ",
    "parent portal JNTUH UCEJ",
    "Jagtial Telangana engineering college",
  ],
  authors: [{ name: COLLEGE.officialName }],
  creator: COLLEGE.officialName,
  publisher: COLLEGE.officialName,
  alternates: { canonical: COLLEGE.baseUrl },
  openGraph: {
    type: "website",
    siteName: COLLEGE.officialName,
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
    { media: "(prefers-color-scheme: light)", color: "#fff" },
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
  const theme = await getServerTheme();
  // L2: The edge middleware stamps a per-request CSP nonce on the x-nonce
  // request header. Next.js SSR reads it back here so the theme-flash
  // inline script in <head> carries the matching nonce attribute;
  // 'strict-dynamic' in the CSP header then permits it (and every
  // dynamically-imported chunk it enables) without 'unsafe-inline'.
  const h = await headers();
  const nonce = h.get("x-nonce") ?? "";
  return (
    <html
      lang="en-IN"
      data-theme={theme ?? "dark"}
      suppressHydrationWarning
    >
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
try {
  var s = localStorage.getItem('gate-monitor-theme');
  var t = s || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  var d = document.documentElement;
  d.setAttribute('data-theme', t);
  d.classList.toggle('dark', t === 'dark');
  d.classList.toggle('light', t === 'light');
  d.classList.toggle('glass', t === 'glass');
} catch (e) {}
`,
          }}
        />
        {/* Un-hide the Next.js streaming SSR wrapper (S:0) immediately.
            Next.js wraps client component trees in <div hidden id="S:0">
            during SSR. The wrapper stays hidden until React hydration
            completes. On slow connections this produces a black screen.
            This script runs in <head> before paint, so content is
            visible on first render. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  function unhide(){
    var s=document.getElementById('S:0');
    if(s){s.hidden=false;s.removeAttribute('hidden');}
    document.querySelectorAll('div[hidden]').forEach(function(d){
      if(d.id==='S:0'||!d.children.length){d.hidden=false;d.removeAttribute('hidden');}
    });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',unhide);
  }else{
    unhide();
  }
  setTimeout(unhide,300);
  setTimeout(unhide,1000);
})();
`,
          }}
        />
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
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-action-primary focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        <ClientProviders>{children}</ClientProviders>
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
