import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ScanDirection, ExitReason } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export function getTimeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 0) return "in the future";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function getDirectionColor(direction: ScanDirection): string {
  return direction === "IN" ? "var(--action-primary)" : "var(--action-danger)";
}

export function getDirectionLabel(direction: ScanDirection): string {
  return direction === "IN" ? "ENTRY" : "EXIT";
}

export function getReasonColor(reason?: ExitReason): string {
  switch (reason) {
    case "Home Out": return "var(--action-danger)";
    case "Day Out": return "var(--action-warning)";
    case "Leave": return "var(--action-info)";
    default: return "var(--action-danger)";
  }
}

export function getReasonIcon(reason?: ExitReason): string {
  switch (reason) {
    case "Home Out": return "🏠";
    case "Day Out": return "☀️";
    case "Leave": return "📝";
    default: return "🚶";
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "IN": return "var(--action-primary)";
    case "OUT": return "var(--action-danger)";
    case "PENDING": return "var(--action-warning)";
    case "APPROVED": return "var(--action-primary)";
    case "REJECTED": return "var(--action-danger)";
    case "EXPIRED": return "var(--text-muted)";
    default: return "var(--text-muted)";
  }
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function getAvatarPlaceholder(name: string): string {
  const initials = getInitials(name) || "??";
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><circle cx='20' cy='20' r='20' fill='%231e293b'/><text x='50%' y='55%' text-anchor='middle' font-size='16' fill='%2394a3b8'>${initials}</text></svg>`;
}


export function getAvatarColor(name: string): string {
  const colors = [
    "bg-emerald-500/20 text-emerald-400",
    "bg-sky-500/20 text-sky-400",
    "bg-violet-500/20 text-violet-400",
    "bg-rose-500/20 text-rose-400",
    "bg-amber-500/20 text-amber-400",
    "bg-blue-500/20 text-blue-400",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-IN");
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

import { fetchWithTimeout } from "./fetch-with-timeout";

export async function authFetch(url: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<Response> {
  return fetchWithTimeout(url, {
    ...init,
    headers: { ...getAuthHeaders(), ...(init.headers ?? {}) },
  }, timeoutMs);
}

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  try {
    // Primary source: the zustand auth store's persisted token (tokenStorage),
    // written to sessionStorage by the login flow under the key "auth.token".
    // The legacy `gate-monitor-auth` key is a fallback for pre-store sessions —
    // it is no longer written, so reading it first is what produced the
    // command-center 401 storm (an empty Authorization header).
    let token: string | null = null;
    let sessionToken: string | null = null;

    if (typeof window !== "undefined") {
      token =
        sessionStorage.getItem("auth.token") ||
        localStorage.getItem("auth.token") ||
        null;

      // X-Session-Token is persisted with the rest of the store under
      // `mycampus-auth` (user.currentSessionToken).
      try {
        const raw =
          sessionStorage.getItem("mycampus-auth") ||
          localStorage.getItem("mycampus-auth");
        if (raw) {
          const parsed = JSON.parse(raw);
          const state = parsed?.state ?? parsed ?? {};
          sessionToken = state.user?.currentSessionToken ?? null;
          if (!token) token = state.token ?? null;
        }
      } catch {
        /* ignore malformed store */
      }

      // Legacy fallback — older clients persisted under this key.
      if (!token && !sessionToken) {
        const raw =
          sessionStorage.getItem("gate-monitor-auth") ??
          localStorage.getItem("gate-monitor-auth");
        if (raw) {
          const parsed = JSON.parse(raw);
          const state = parsed?.state ?? parsed ?? {};
          token = state.token ?? null;
          sessionToken = sessionToken ?? state.user?.currentSessionToken ?? null;
        }
      }
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (sessionToken) {
      headers["X-Session-Token"] = sessionToken;
    }

    return headers;
  } catch (e) {
    return headers;
  }
}
