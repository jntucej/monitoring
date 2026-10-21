"use client";

import { LogIn } from "lucide-react";
import { MagneticButton } from "./components/ui/MagneticButton";

/**
 * Hero primary CTA.
 *
 * `MagneticButton` is a client component. The home page is a *server*
 * component, so it cannot pass an `onClick` event handler straight to it
 * ("Event handlers cannot be passed to Client Component props"). This
 * client wrapper owns the handler — on click it navigates to /login via
 * a full page transition, while `MagneticButton` still provides the
 * magnetic press effect.
 */
export function SignInCta({ label }: { label: string }) {
  return (
    <MagneticButton
      onClick={() => {
        window.location.href = "/login";
      }}
      className="inline-flex items-center gap-2 rounded-lg bg-[var(--action-primary)] px-5 py-3 font-semibold text-[var(--bg-base)] hover:opacity-90"
    >
      <LogIn className="h-4 w-4" />
      {label}
    </MagneticButton>
  );
}
