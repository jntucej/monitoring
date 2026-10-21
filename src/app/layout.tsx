import type { Metadata, Viewport } from "next";
import "./globals.css";
import { COLLEGE } from "@/lib/college-config";
import { organizationJsonLd } from "@/lib/seo";
import { ClientProviders } from "./ClientProviders";
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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = await getServerTheme();
  return (
    <html
      lang="en-IN"
      data-theme={theme ?? "dark"}
      suppressHydrationWarning
    >
      <head>
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
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--action-primary)] focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
