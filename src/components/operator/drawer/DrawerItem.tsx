"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface DrawerItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  /** When true, this item is the currently active page. */
  active?: boolean;
}

export function DrawerItem({ href, label, icon: Icon, active = false }: DrawerItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname?.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
        "hover:bg-[var(--bg-elevated)] active:scale-[0.99]",
        isActive
          ? "text-[var(--action-primary)] bg-[var(--action-primary)]/10 border-l-2 border-[var(--action-primary)]"
          : "text-[var(--text-secondary)] border-l-2 border-transparent"
      )}
      style={{ height: "48px" }}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className={cn("w-5 h-5 shrink-0", isActive && "text-[var(--action-primary)]")} />
      <span className="flex-1 truncate">{label}</span>
      {isActive && (
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--action-primary)]" />
      )}
    </Link>
  );
}
