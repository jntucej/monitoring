import Link from "next/link";
import { COLLEGE } from "@/lib/college-config";

/**
 * HomeFooter — matte footer. No motion except a CSS underline-draw on
 * link hover (see home.css).
 *
 * Content pulled from COLLEGE config (no invented copy): official name,
 * address, contact. Links: About → /about, Help → /help, Sign in → /login.
 *
 * This is a server component (no "use client") so it stays out of the
 * client JS bundle.
 */
export function HomeFooter() {
  return (
    <footer className="home-footer mx-auto mt-16 w-full max-w-6xl border-t border-[var(--home-border-soft,rgba(255,255,255,0.08))] px-6 py-12">
      <div className="flex flex-col gap-8 md:flex-row md:justify-between">
        <div className="max-w-sm">
          <p className="font-semibold text-[var(--home-text-primary,#F3F4F6)]">
            {COLLEGE.officialName}
          </p>
          <p className="mt-2 text-sm text-[var(--home-text-muted,#6B7280)]">
            {COLLEGE.addressLine1}, {COLLEGE.addressLine2}
            {COLLEGE.city ? `, ${COLLEGE.city}` : ""}
            {COLLEGE.state ? `, ${COLLEGE.state}` : ""} {COLLEGE.pincode}
          </p>
          <p className="mt-2 text-sm text-[var(--home-text-muted,#6B7280)]">
            {COLLEGE.email} · {COLLEGE.phone}
          </p>
        </div>
        <nav
          aria-label="Footer"
          className="flex gap-10 text-sm text-[var(--home-text-secondary,#9CA3AF)]"
        >
          <Link href="/about" className="footer-link block">
            About
          </Link>
          <Link href="/help" className="footer-link block">
            Help
          </Link>
          <Link href="/login" className="footer-link block">
            Sign in
          </Link>
        </nav>
      </div>
      <p className="mt-10 text-xs text-[var(--home-text-muted,#6B7280)]">
        © {new Date().getFullYear()} {COLLEGE.officialName}. All rights
        reserved.
      </p>
    </footer>
  );
}
