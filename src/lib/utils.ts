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

export function getTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
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
    case "Day Pass": return "var(--action-warning)";
    case "Leave": return "var(--action-info)";
    default: return "var(--action-danger)";
  }
}

export function getReasonIcon(reason?: ExitReason): string {
  switch (reason) {
    case "Home Out": return "🏠";
    case "Day Pass": return "☀️";
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

export function formatNumber(n: number): string {
  return n.toLocaleString("en-IN");
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (typeof window === "undefined") {
    return headers;
  }
  
  try {
    const raw = sessionStorage.getItem("gate-monitor-auth") ?? localStorage.getItem("gate-monitor-auth");
    if (!raw) return headers;
    
    const parsed = JSON.parse(raw);
    const state = parsed?.state || {};
    const token = state.token;
    const sessionToken = state.user?.currentSessionToken;
    
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
