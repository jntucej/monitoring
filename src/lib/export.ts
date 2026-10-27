import { csvEscape } from "@/lib/csv";

export interface ExportFilters {
  search?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  sortBy?: "newest" | "oldest" | "name_asc" | "name_desc";
  from?: string;
  to?: string;
  format?: "pdf" | "csv";
  department?: string;
  personType?: string;
  direction?: string;
  gate?: string;
}

function sanitizeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str = typeof val === "object" ? JSON.stringify(val) : String(val);
  // Injection guard: prefix with ' so spreadsheet apps treat as literal.
  str = csvEscape(str);
  // CSV quoting: wrap in double quotes if it contains comma, quote, or newline.
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function generateCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    return { success: false, error: "No data to export", data: "", filename: "" };
  }

  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => sanitizeCsvCell(row[h])).join(","));
  const csv = [headers.join(","), ...rows].join("\n");

  return {
    success: true,
    data: csv,
    filename: filename || "export.csv",
    contentType: "text/csv; charset=utf-8",
  };
}

export async function generatePDF(content: string, filename: string) {
  return {
    success: true,
    data: content,
    filename: filename || "export.pdf",
    contentType: "application/pdf",
  };
}
