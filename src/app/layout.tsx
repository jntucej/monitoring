import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "./ClientProviders";
import { getDbClient } from "@/lib/db";
import { getServerTheme } from "@/lib/theme-cookie";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  let siteName = "Gate Monitor";
  let description = "Student Gate Monitoring System";
  
  try {
    const dbClient = getDbClient();
    const { data, error } = await dbClient
      .from('config_college_info')
      .select('name, short_name')
      .limit(1)
      .maybeSingle();

    if (data && !error && data.short_name) {
      siteName = `${data.short_name} Gate Monitor`;
      description = `Student Gate Monitoring System — ${data.name || siteName}`;
    }
  } catch (err) {
    // silently fallback
  }

  return {
    title: siteName,
    description: description,
    icons: [{ rel: "icon", url: "/favicon.ico" }],
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getServerTheme();

  return (
    <html
      lang="en"
      data-theme={theme}
      data-scroll-behavior="smooth"
      className={`${inter.variable} min-h-full antialiased ${theme}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] font-[var(--font-family)]">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}



