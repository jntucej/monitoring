"use client";

import React, { Suspense, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { MobileNavigation } from "@/components/mobile/MobileNavigation";

const SCROLL_CACHE = new Map<string, number>();

function ScrollRestorer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const previousPathname = useRef<string>("");

  useEffect(() => {
    if (previousPathname.current) {
      SCROLL_CACHE.set(previousPathname.current, window.scrollY);
    }
    const saved = SCROLL_CACHE.get(pathname) ?? 0;
    window.scrollTo({ top: saved, behavior: "instant" as ScrollBehavior });
    previousPathname.current = pathname;
  }, [pathname]);

  return <>{children}</>;
}

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] flex flex-col bg-[var(--bg-base,#0a0d13)] text-[var(--text-primary,#eef1f6)]">
      <ScrollRestorer>
        <main className="flex-1 pb-24 md:pb-6">{children}</main>
      </ScrollRestorer>
      <Suspense fallback={null}>
        <MobileNavigation />
      </Suspense>
    </div>
  );
}
