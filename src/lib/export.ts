
export interface ExportFilters {
  from: string;
  to: string;
  format?: "pdf" | "csv";
  department?: string;
  personType?: string;
  direction?: string;
  gate?: string;
  search?: string;
  sortBy?: "newest" | "oldest" | "name_asc" | "name_desc";
}

export async function generateCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    return { success: false, error: "No data to export", data: "", filename: "" };
  }

  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => JSON.stringify(row[h] ?? "")).join(","));
  const csv = [headers.join(","), ...rows].join("\n");

  return {
    success: true,
    data: csv,
    filename: `${filename}.csv`,
  };
}

export async function generatePDF(content: string, filename: string) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${filename}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; padding: 20px; }
      .no-print { display: none; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; background: #fff; color: #0f172a; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #3b82f6; padding-bottom: 16px; margin-bottom: 24px; }
    .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
    .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
    .meta { text-align: right; font-size: 12px; color: #475569; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
    .summary-num { font-size: 20px; font-weight: 800; color: #1e293b; }
    .summary-lbl { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
    th { background: #0f172a; color: #ffffff; padding: 10px 12px; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f8fafc; }
    .badge-in { background: #dcfce7; color: #15803d; font-weight: 700; padding: 2px 8px; border-radius: 9999px; font-size: 10px; }
    .badge-out { background: #fee2e2; color: #b91c1c; font-weight: 700; padding: 2px 8px; border-radius: 9999px; font-size: 10px; }
    .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  </style>
</head>
<body>
  ${content}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 500);
    };
  </script>
</body>
</html>`;

  return {
    success: true,
    data: html,
    filename: `${filename}.html`,
  };
}

