"use client";

interface AuditLogRowProps {
  log: {
    id?: string;
    action: string;
    user_name?: string;
    user_role?: string;
    details: Record<string, unknown> | string | number | boolean | null;
    timestamp?: string;
  };
}

export function AuditLogRow({ log }: AuditLogRowProps) {
  return (
    <tr className="hover:bg-bg-elevated/50">
      <td className="py-2.5 px-4 text-xs font-mono text-text-muted">
        {log.timestamp ? new Date(log.timestamp).toLocaleString("en-IN") : "—"}
      </td>
      <td className="py-2.5 px-4 font-mono font-bold text-xs text-action-info">{log.action}</td>
      <td className="py-2.5 px-4 text-xs font-medium">{log.user_name || "System"}</td>
      <td className="py-2.5 px-4 text-xs font-mono text-text-muted capitalize">{log.user_role || "—"}</td>
      <td className="py-2.5 px-4 text-xs text-text-muted max-w-sm truncate">
        {typeof log.details === "object" ? JSON.stringify(log.details) : String(log.details || "—")}
      </td>
    </tr>
  );
}
