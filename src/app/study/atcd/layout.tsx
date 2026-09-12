"use client";

import { MasteryProvider } from "@/app/study/automata/components/predict/MasteryProvider";

export default function AtcdLayout({ children }: { children: React.ReactNode }) {
  return (
    <MasteryProvider>
      <div className="min-h-[calc(100vh-4rem)] bg-[var(--bg)] text-[var(--text-primary)] antialiased">
        {children}
      </div>
    </MasteryProvider>
  );
}