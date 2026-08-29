"use client";

import React from "react";
import { MobileNavigation } from "@/components/mobile/MobileNavigation";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] flex flex-col bg-[var(--bg-base,#0a0d13)] text-[var(--text-primary,#eef1f6)]">
      <main className="flex-1 pb-24 md:pb-6">{children}</main>
      <MobileNavigation />
    </div>
  );
}
