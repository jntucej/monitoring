"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { clearCache } from "@/hooks/useApiResource";

export function RoleLogoutButton({
  variant = "button",
  confirmHighPrivilege = true,
  className = "",
}: {
  variant?: "button" | "menu-item" | "compact";
  confirmHighPrivilege?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logoutStore = useAuthStore((s) => s.logout);
  const [signingOut, setSigningOut] = useState(false);

  const role = (user?.role ?? "").toLowerCase();
  const isHighPrivilege = [
    "operator",
    "supervisor",
    "principal",
    "vice_principal",
    "admin",
    "sysadmin",
  ].includes(role);

  const handleLogout = async () => {
    if (signingOut) return;
    if (confirmHighPrivilege && isHighPrivilege) {
      const ok =
        typeof window === "undefined"
          ? true
          : window.confirm("Sign out of your current session?");
      if (!ok) return;
    }

    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    } finally {
      try {
        if (typeof logoutStore === "function") {
          logoutStore();
        }
      } catch {
        // ignore if store shape differs
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("access_token");
        window.localStorage.removeItem("refresh_token");
        window.sessionStorage.clear();
      }

      try {
        clearCache();
      } catch {
        // ignore
      }

      const targetLogin =
        role === "operator"
          ? "/login/operator"
          : role
          ? `/login?role=${encodeURIComponent(role)}`
          : "/login";

      router.replace(targetLogin);
      router.refresh();
    }
  };

  const baseStyle =
    variant === "compact"
      ? "inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-xs font-medium text-action-danger hover:bg-rose-500/10 transition-colors"
      : variant === "menu-item"
      ? "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-action-danger hover:bg-rose-500/10 transition-colors"
      : "inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs sm:text-sm font-semibold text-action-danger hover:bg-rose-500/20 transition-colors disabled:opacity-50";

  return (
    <button
      type="button"
      data-testid="role-logout-button"
      disabled={signingOut}
      onClick={handleLogout}
      className={`${baseStyle} ${className}`}
    >
      {signingOut ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      <span>{signingOut ? "Signing out..." : "Log Out"}</span>
    </button>
  );
}
