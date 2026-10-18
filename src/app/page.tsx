import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Shield, HelpCircle, LifeBuoy, Info, MapPin } from "lucide-react";
import { createAuthContext } from "@/lib/authContext";
import { getDefaultRouteForRole } from "@/server/policy/routes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MyCampus — JNTUHCEJ",
  description: "Your campus, cared for. Sign in to MyCampus at JNTU College of Engineering Jagtial.",
  robots: { index: false, follow: false },
};

export default async function RootPage() {
  const token = (await cookies()).get("access_token")?.value;

  if (token) {
    try {
      const auth = await createAuthContext(token);
      if (auth && auth.isAuthenticated && auth.isActive && auth.role) {
        redirect(getDefaultRouteForRole(auth.role, auth.gateId || undefined));
      }
    } catch {}
  }

  return (
    <main className="min-h-screen flex flex-col bg-[var(--bg-surface)] text-[var(--text-primary)]">
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md space-y-10">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center" aria-hidden="true">
              <Shield className="w-8 h-8 text-emerald-400" strokeWidth={1.75} />
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)] font-medium">JNTU College of Engineering Jagtial</p>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">MyCampus</h1>
              <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">Your campus, cared for. Sign in to access passes, leave requests, and your student record.</p>
            </div>
          </div>
          <div className="flex flex-col items-center space-y-3">
            <Link href="/login" className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-600 active:scale-[0.98] transition-all">
              Sign in <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-xs text-[var(--text-muted)]">Use your JNTUHCEJ credentials</p>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-2">
            <Link href="/help" className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated,var(--bg-surface))] px-3 py-4 text-center hover:border-emerald-500/40 transition-colors">
              <HelpCircle className="w-5 h-5 text-[var(--text-secondary)]" />
              <span className="text-xs font-medium">Help</span>
            </Link>
            <Link href="/support" className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated,var(--bg-surface))] px-3 py-4 text-center hover:border-emerald-500/40 transition-colors">
              <LifeBuoy className="w-5 h-5 text-[var(--text-secondary)]" />
              <span className="text-xs font-medium">Support</span>
            </Link>
            <Link href="/about" className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated,var(--bg-surface))] px-3 py-4 text-center hover:border-emerald-500/40 transition-colors">
              <Info className="w-5 h-5 text-[var(--text-secondary)]" />
              <span className="text-xs font-medium">About</span>
            </Link>
          </div>
        </div>
      </div>
      <footer className="border-t border-[var(--border)] px-6 py-4">
        <div className="max-w-md mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
          <span>© 2026 JNTUHCEJ</span>
          <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Nachupally, Kondaggattu, Jagtial, Telangana 505501</span>
        </div>
      </footer>
    </main>
  );
}
