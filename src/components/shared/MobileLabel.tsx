"use client";

import { cn } from "@/lib/utils";

interface MobileLabelProps {
  emoji: string;
  text: string;
  className?: string;
}

export function MobileLabel({ emoji, text, className = "" }: MobileLabelProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="sm:hidden text-base leading-none">{emoji}</span>
      <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
        <span className="text-sm leading-none">{emoji}</span>
        <span>{text}</span>
      </span>
    </span>
  );
}
