import React, { ReactNode } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";

interface Column<T> {
  header: string;
  accessor: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  keyExtractor: (item: T) => string;
}

/**
 * DataTable - Responsive data table with mobile card layout.
 * Below md breakpoint (768px), renders as stacked cards for better mobile UX.
 * Above md breakpoint, renders as traditional table.
 */
export function DataTable<T>({
  columns,
  data,
  loading,
  error,
  emptyMessage = "No records found",
  keyExtractor,
}: DataTableProps<T>) {
  // Use useBreakpoint for responsive behavior instead of CSS-only approach
  const breakpoints = useBreakpoint({ sm: "(min-width: 640px)", md: "(min-width: 768px)" });
  const isMobile = !breakpoints.md;

  if (isMobile) {
    // Mobile card layout
    return (
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-[var(--text-muted)]">Loading…</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400">{error}</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-muted)]">{emptyMessage}</div>
        ) : (
          data.map((item) => (
            <div
              key={keyExtractor(item)}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm"
            >
              {columns.map((col, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col py-2 ${idx !== columns.length - 1 ? "border-b border-[var(--border)]/50 last:border-0" : ""}`}
                >
                  <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    {col.header}
                  </span>
                  <span className={`text-sm text-[var(--text-primary)] ${col.className || ""}`}>
                    {col.accessor(item)}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    );
  }

  // Desktop table layout
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
      <table className="w-full text-sm min-w-full">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
            {columns.map((col, idx) => (
              <th key={idx} className={`p-4 font-medium ${col.className || ""}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="p-8 text-center text-[var(--text-muted)]">
                Loading…
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={columns.length} className="p-8 text-center text-rose-400">
                {error}
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-8 text-center text-[var(--text-muted)]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr key={keyExtractor(item)} className="hover:bg-[var(--bg-active)] transition-colors">
                {columns.map((col, idx) => (
                  <td key={idx} className={`p-4 ${col.className || ""}`}>
                    {col.accessor(item)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
