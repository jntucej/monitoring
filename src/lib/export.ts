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

function sanitizeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  let str = typeof val === "object" ? JSON.stringify(val) : String(val);
  if (/^[=+\-@\t\n+]/.test(str)) {
    str = "'" + str;
  }
  return JSON.stringify(str);
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
