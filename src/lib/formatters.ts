// Shared formatting utilities for consistent UI across dashboards

export const fmtInt = new Intl.NumberFormat("en-IN").format;

export const fmtBytes = (n: number): string => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let val = n;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

export const fmtDate = (iso: string): string => {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const fmtDateTime = (iso: string): string => {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const fmtTime = (iso: string): string => {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const fmtRelative = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

/** Format a cell value — never render null/undefined as blank */
export function fmtCell(value: unknown, fallback = "—"): string {
  if (value == null || value === "") return fallback;
  if (typeof value === "number") return fmtInt(value);
  return String(value);
}

/** Format a boolean as a colored badge */
export function fmtBoolean(value: boolean): { text: string; className: string } {
  if (value) return { text: "Yes", className: "bg-emerald-500/10 text-emerald-400" };
  return { text: "No", className: "bg-slate-500/10 text-slate-400" };
}

/** Format a status string as a colored badge */
export function fmtStatus(status: string): { text: string; className: string } {
  const s = status.toLowerCase();
  if (["active", "online", "approved", "completed", "present"].includes(s)) {
    return { text: status, className: "bg-emerald-500/10 text-emerald-400" };
  }
  if (["pending", "in_progress", "processing"].includes(s)) {
    return { text: status, className: "bg-amber-500/10 text-amber-400" };
  }
  if (["rejected", "offline", "failed", "absent", "cancelled"].includes(s)) {
    return { text: status, className: "bg-rose-500/10 text-rose-400" };
  }
  return { text: status, className: "bg-slate-500/10 text-slate-400" };
}