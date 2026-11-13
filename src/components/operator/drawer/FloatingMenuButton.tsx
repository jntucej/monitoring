"use client";

import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingMenuButtonProps {
  onClick: () => void;
  className?: string;
}

export function FloatingMenuButton({ onClick, className }: FloatingMenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "fixed bottom-6 left-6 z-40 w-12 h-12 rounded-full",
        "bg-bg-surface border border-border shadow-lg",
        "text-text-secondary hover:text-text-primary hover:border-action-primary",
        "flex items-center justify-center transition-all active:scale-95",
        className
      )}
      aria-label="Open navigation menu"
    >
      <Menu className="w-6 h-6" />
    </button>
  );
}
