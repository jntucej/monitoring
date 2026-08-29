"use client";

import React from "react";
import { MobileNavigation } from "@/components/mobile/MobileNavigation";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[100dvh] min-h-[100dvh] flex flex-col overflow-hidden bg-[var(--bg-base,#0a0d13)] text-[var(--text-primary,#eef1f6)]">
      <main className="flex-1 overflow-y-auto -webkit-overflow-scrolling-touch pb-24 md:pb-6">{children}</main>
      <MobileNavigation />
    </div>
  );
}
