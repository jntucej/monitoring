import React, { ReactNode } from "react";

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

export function DataTable<T>({
  columns,
  data,
  loading,
  error,
  emptyMessage = "No records found",
  keyExtractor,
}: DataTableProps<T>) {
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
