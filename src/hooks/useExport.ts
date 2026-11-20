/**
 * useExport — client-side CSV export trigger.
 * Call `exportCSV(rows, columns, filename)` to download a file in the browser.
 * No server round-trip; suitable for period-filtered views.
 */
"use client";

import { useCallback } from "react";
import { csvEscape } from "@/lib/csv";

export interface CsvColumn<T> {
  key: keyof T | string;
  header: string;
  /** Transform row value to display string. Default String(). */
  format?: (row: T) => string;
}

/**
 * Build a CSV string from rows + columns. Uses csvEscape for injection safety.
 */
export function buildCSV<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const headers = columns.map((c) => c.header).join(",");
  const lines = rows.map((row) =>
    columns
      .map((col) => {
        const raw = col.format
          ? col.format(row)
          : String((row as Record<string, unknown>)[String(col.key)] ?? "");
        return csvEscape(raw);
      })
      .join(",")
  );
  return [headers, ...lines].join("\n");
}

/**
 * Download a CSV file in the browser.
 */
export function downloadCSV(csvText: string, filename: string): void {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface UseExportResult {
  exportCSV: <T>(rows: T[], columns: CsvColumn<T>[], filename?: string) => void;
  buildCSV: typeof buildCSV;
}

export function useExport() {
  const exportCSV = useCallback(
    <T,>(rows: T[], columns: CsvColumn<T>[], filename = "export.csv") => {
      downloadCSV(buildCSV(rows, columns), filename);
    },
    []
  );

  return { exportCSV, buildCSV };
}

export default useExport;
