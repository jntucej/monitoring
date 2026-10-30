"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X, Home, FileText, Wrench, User, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { DrawerCategory } from "./DrawerCategory";
import { useOperatorGate } from "@/hooks/useOperatorGate";
import type { LucideIcon } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useBreakpoint } from "@/hooks/useBreakpoint";

export interface DrawerCategoryItem {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
}

export interface DrawerCategoryDef {
  id: string;
  label: string;
  icon?: LucideIcon;
  items: DrawerCategoryItem[];
}

const CATEGORIES: DrawerCategoryDef[] = [
  {
    id: "scan",
    label: "SCAN",
    icon: Home,
    items: [
      { href: "/gate/main", label: "Gate Desk", icon: Home },
      { href: "/operator/manual-entry", label: "Manual Entry", icon: Home },
      { href: "/operator/pass-verification", label: "Pass Verification", icon: Home },
    ],
  },
  {
    id: "review",
    label: "REVIEW",
    icon: FileText,
    items: [
      { href: "/operator/transactions", label: "Transactions", icon: FileText },
      { href: "/operator/exceptions", label: "Exceptions", icon: FileText },
    ],
  },
  {
    id: "tools",
    label: "TOOLS",
    icon: Wrench,
    items: [
      { href: "/operator/mode", label: "Mode", icon: Wrench },
      { href: "/operator/announcements", label: "Announcements", icon: Wrench },
      { href: "/operator/lookup", label: "Lookup", icon: Wrench },
    ],
  },
  {
    id: "profile",
    label: "PROFILE",
    icon: User,
    items: [
      { href: "/profile", label: "Profile", icon: User },
      { href: "/settings/password", label: "Password", icon: User },
      { href: "/settings/notifications", label: "Notifications", icon: User },
    ],
  },
];

interface OperatorDrawerProps {
  open: boolean;
  onClose: () => void;
  /** True when showing a side rail (tablet/desktop), false for mobile bottom drawer. */
  isRail?: boolean;
}

export function OperatorDrawer({ open, onClose, isRail = false }: OperatorDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, assigned } = useOperatorGate();
  const { md: isDesktop } = useBreakpoint({ md: "(min-width: 768px)" });
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // Track which category is expanded (only one at a time)
  const [expandedCategory, setExpandedCategory] = useState<string | null>("scan");

  // Close drawer on navigation
  useEffect(() => {
    if (!isRail) {
      onClose();
    }
  }, [pathname, isRail, onClose]);

  const handleToggle = useCallback((categoryId: string) => {
    setExpandedCategory((prev) => (prev === categoryId ? null : categoryId));
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    router.push("/login/operator");
  }, [logout, router]);

  // Check if any item in a category is active
  const getCategoryActive = useCallback(
    (category: DrawerCategoryDef) => {
      return category.items.some((item) => {
        return pathname === item.href || pathname?.startsWith(item.href + "/");
      });
    },
    [pathname]
  );

  // Desktop/tablet rail: always open when assigned
  if (!assigned && role !== "worker") {
    return null;
  }

  // Mobile: bottom sheet drawer
  if (!isRail && !isDesktop) {
    return (
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={onClose}
              aria-hidden="true"
            />
            
            {/* Bottom drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-50 bg-[var(--bg-surface)] border-t border-[var(--border)] rounded-t-2xl shadow-2xl max-h-[80dvh] flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation drawer"
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 rounded-full bg-[var(--border)]" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Home className="w-5 h-5 text-[var(--action-primary)]" />
                  <span className="text-sm font-bold text-[var(--text-primary)]">
                    {user?.name || "Operator"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Categories */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {CATEGORIES.map((category) => (
                  <DrawerCategory
                    key={category.id}
                    category={category}
                    isOpen={expandedCategory === category.id}
                    onToggle={() => handleToggle(category.id)}
                  />
                ))}
              </div>

              {/* Logout */}
              <div className="border-t border-[var(--border)] p-4">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-semibold text-sm transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Tablet/Desktop: left rail
  return (
    <aside
      className={cn(
        "hidden md:flex flex-col w-56 lg:w-64 h-full bg-[var(--bg-surface)] border-r border-[var(--border)]",
        "fixed left-0 top-0 z-40"
      )}
      role="navigation"
      aria-label="Operator navigation"
    >
      {/* Rail header */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-[var(--border)]">
        <Home className="w-5 h-5 text-[var(--action-primary)]" />
        <span className="text-sm font-bold text-[var(--text-primary)]">
          Gate Monitor
        </span>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--action-primary)]/20 text-[var(--action-primary)] flex items-center justify-center text-xs font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || "O"}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
              {user?.name || "Operator"}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] truncate">
              {user?.gateId ? `Gate ${user.gateId}` : "No gate assigned"}
            </p>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {CATEGORIES.map((category) => (
          <DrawerCategory
            key={category.id}
            category={{
              ...category,
              items: category.items.map((item) => ({
                ...item,
                active: pathname === item.href || pathname?.startsWith(item.href + "/"),
              })),
            }}
            isOpen={getCategoryActive(category) || expandedCategory === category.id}
            onToggle={() => handleToggle(category.id)}
          />
        ))}
      </div>

      {/* Logout */}
      <div className="border-t border-[var(--border)] p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
