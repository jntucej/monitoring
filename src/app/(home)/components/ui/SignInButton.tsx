"use client";

import Link from "next/link";
import { MagneticButton } from "./MagneticButton";

export function SignInButton() {
  return (
    <div className="fixed right-4 top-4 z-50 md:right-6 md:top-6">
      <Link href="#login-gateway" aria-label="Sign in">
        <MagneticButton
          strength={0.25}
          className="rounded-full border border-[var(--home-border-soft)] bg-[color-mix(in_srgb,var(--home-bg-base)_82%,white)] px-4 py-2 text-sm font-medium text-[var(--home-text-primary)] shadow-md backdrop-blur-sm hover:bg-[color-mix(in_srgb,var(--home-bg-base)_70%,white)]"
        >
          Sign in
        </MagneticButton>
      </Link>
    </div>
  );
}
