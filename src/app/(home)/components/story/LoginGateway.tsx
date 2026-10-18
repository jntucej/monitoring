"use client";

import { Suspense } from "react";
import { LoginForm } from "@/components/shared/LoginForm";
import { EmotionalQuote } from "../cinematic";
import { GlassPanel } from "../ui/GlassPanel";

export function LoginGateway() {
  return (
    <section
      id="login-gateway"
      className="relative mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-24"
    >
      <EmotionalQuote
        text="Your story starts here."
        className="mb-12 text-center"
      />
      <GlassPanel
        variant="strong"
        entry
        className="w-full max-w-md px-8 py-10"
      >
        <Suspense fallback={<div className="h-64" />}>
          <LoginForm
            title="Welcome"
            subtitle="Sign in to see the campus through your eyes."
          />
        </Suspense>
      </GlassPanel>
      <p className="mt-8 text-xs text-[var(--home-text-muted)]">
        Every entrance. Every exit. Every story. Protected.
      </p>
    </section>
  );
}
