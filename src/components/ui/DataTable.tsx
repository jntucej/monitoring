// src/components/ui/DataTable.tsx
// Shared data table with mobile card fallback + optional sticky first column.
import React, { ReactNode } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";

export interface Column<T> {
  header: string;
  accessor: (item: T) => ReactNode;
  className?: string;
  // When true, this column is pinned to the left edge on md+.
  sticky?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  keyExtractor: (item: T) => string;
  /**
   * 'cards' (default) renders each row as a stacked card below md;
   * 'table' keeps a single scrollable table at every width.
   */
  mobileLayout?: "cards" | "table";
  /**
   * When true, the first column stays fixed on the left edge on md+
   * so the identifier column (roll / ticket / gate code) is always visible.
   */
  stickyFirstColumn?: boolean;
}

/**
 * DataTable - responsive data table.
 *
 * - `mobileLayout: 'cards'` (default) renders stacked cards below md (768px),
 *   a traditional table above.
 * - `mobileLayout: 'table'` keeps a single scrollable table at every width,
 *   wrapped in `overflow-x-auto` so it never breaks the page layout.
 * - `stickyFirstColumn` pins the first column to the left edge on md+.
 */
export function DataTable<T>({
  columns,
  data,
  loading,
  error,
  emptyMessage = "No records found",
  keyExtractor,
  mobileLayout = "cards",
  stickyFirstColumn = true,
}: DataTableProps<T>) {
  const breakpoints = useBreakpoint({ sm: "(min-width: 640px)", md: "(min-width: 768px)" });
  const isMobile = !breakpoints.md;

  const emptyState = (
    <div className="p-8 text-center text-[var(--text-muted)]">{emptyMessage}</div>
  );

  // ---- 'table' layout: single scrollable table at every width ----
  if (mobileLayout === "table") {
    return (
      <div className="overflow-x-auto overscroll-contain -webkit-overflow-scrolling-touch rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
        <table className="w-full min-w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`p-4 font-medium ${col.className || ""} ${
                    stickyFirstColumn && idx === 0 ? "sticky left-0 bg-[var(--bg-surface)] z-10" : ""
                  }`}
                >
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
                <td colSpan={columns.length} className="p-8 text-center text-rose-400">{error}</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>{emptyState}</td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={keyExtractor(item)} className="hover:bg-[var(--bg-active)] transition-colors">
                  {columns.map((col, idx) => (
                    <td
                      key={idx}
                      className={`p-4 ${col.className || ""} ${
                        stickyFirstColumn && idx === 0 ? "sticky left-0 bg-[var(--bg-surface)] z-10" : ""
                      }`}
                    >
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

  // ---- 'cards' layout: stacked cards below md, table above ----
  if (isMobile) {
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
                  className={`flex flex-col py-2 ${idx !== columns.length - 1 ? "border-b border-[var(--border)]/50" : ""}`}
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

  // Desktop table layout (md+)
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
      <table className="w-full text-sm min-w-full">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`p-4 font-medium ${col.className || ""} ${
                  stickyFirstColumn && idx === 0 ? "sticky left-0 bg-[var(--bg-surface)] z-10" : ""
                }`}
              >
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
              <td colSpan={columns.length} className="p-8 text-center text-rose-400">{error}</td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>{emptyState}</td>
            </tr>
          ) : (
            data.map((item) => (
              <tr key={keyExtractor(item)} className="hover:bg-[var(--bg-active)] transition-colors">
                {columns.map((col, idx) => (
                  <td
                    key={idx}
                    className={`p-4 ${col.className || ""} ${
                      stickyFirstColumn && idx === 0 ? "sticky left-0 bg-[var(--bg-surface)] z-10" : ""
                    }`}
                  >
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
