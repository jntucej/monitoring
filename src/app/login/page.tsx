import { LoginForm } from "@/components/shared/LoginForm";
import { Suspense } from 'react';

export default function UnifiedLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] text-[var(--text-muted)]">Loading...</div>}>
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] p-4 sm:p-8 relative overflow-hidden">
        {/* Ambient shapes to match the cinematic vibe */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 w-[28rem] h-[28rem] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <LoginForm
          role="all"
          title="Login"
          subtitle=" routing based on ur role."
        />
      </div>
    </Suspense>
  );
}
