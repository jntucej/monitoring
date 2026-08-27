import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { SafeAreaAppShell } from "@/components/shared/SafeAreaAppShell";
import { supabase } from "@/lib/supabaseClient";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  let siteName = "Gate Monitor";
  let description = "Student Gate Monitoring System";
  
  try {
    const { data } = await supabase
      .from('config_college_info')
      .select('name, short_name')
      .limit(1)
      .maybeSingle();

    if (data) {
      siteName = `${data.short_name} Gate Monitor`;
      description = `Student Gate Monitoring System — ${data.name}`;
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" data-scroll-behavior="smooth" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] font-[var(--font-family)]">
        <ToastProvider>
          <SafeAreaAppShell>{children}</SafeAreaAppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
