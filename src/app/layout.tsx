import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "./ClientProviders";
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
    <html lang="en" data-theme="dark" data-scroll-behavior="smooth" suppressHydrationWarning className={`${inter.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] font-[var(--font-family)]">
        {/* Restore saved theme before first paint — supports dark, light, and glossy glass themes */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("gate-monitor-theme");if(t==="light"||t==="dark"||t==="glass"){document.documentElement.setAttribute("data-theme",t);document.documentElement.classList.remove("dark","light","glass");document.documentElement.classList.add(t);}else{document.documentElement.setAttribute("data-theme","dark");document.documentElement.classList.add("dark");localStorage.setItem("gate-monitor-theme","dark");}}catch(e){document.documentElement.setAttribute("data-theme","dark");document.documentElement.classList.add("dark");}`,
          }}
        />
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}


