import { getDbClient } from "@/lib/db";

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

export async function exportDailyReport(date: string, format: "pdf" | "csv" = "csv") {
  return exportRangeReport({ from: date, to: date, format });
}

export async function exportRangeReport(filters: ExportFilters | string, toDate?: string, formatType: "pdf" | "csv" = "csv") {
  const opts: ExportFilters = typeof filters === "string" 
    ? { from: filters, to: toDate || filters, format: formatType } 
    : filters;

  const from = opts.from;
  const to = opts.to || opts.from;
  const format = opts.format || "csv";

  const fromIso = `${from}T00:00:00.000Z`;
  const toIso = `${to}T23:59:59.999Z`;

  const [scansRes, usersRes] = await Promise.all([
    getDbClient()
      .from("movement_logs")
      .select("*")
      .gte("timestamp", fromIso)
      .lte("timestamp", toIso)
      .order("timestamp", { ascending: false }),
    getDbClient()
      .from("users")
      .select("id, unique_id, name, role, department"),
  ]);

  const rawScans = scansRes.data || [];
  const userMap = new Map((usersRes.data || []).map((u: any) => [u.id, u]));

  let items = rawScans.map((scan: any) => {
    const user = userMap.get(scan.user_id) as any;
    const deptCodeMap: Record<string, string> = {
      "02": "EEE", "03": "ME", "04": "ECE", "05": "CSE", "12": "IT"
    };
    const rawDept = user?.department || scan.department || "";
    const dept = deptCodeMap[rawDept] || rawDept || "—";

    return {
      id: scan.id,
      userId: user?.unique_id || scan.user_id || scan.roll || "—",
      name: user?.name || scan.name || scan.person_name || "Campus Member",
      personType: (user?.role || scan.person_type || scan.personType || "student").toLowerCase(),
      department: dept,
      direction: (scan.direction || "IN").toUpperCase(),
      gate: scan.gate_name || scan.gate_id || "Main Gate",
      timestamp: scan.timestamp,
    };
  });

  // Apply filters
  if (opts.department && opts.department.toLowerCase() !== "all") {
    items = items.filter((i) => i.department.toLowerCase() === opts.department?.toLowerCase());
  }

  if (opts.personType && opts.personType.toLowerCase() !== "all") {
    items = items.filter((i) => i.personType.toLowerCase() === opts.personType?.toLowerCase());
  }

  if (opts.direction && opts.direction.toLowerCase() !== "all") {
    items = items.filter((i) => i.direction.toLowerCase() === opts.direction?.toLowerCase());
  }

  if (opts.gate && opts.gate.toLowerCase() !== "all") {
    items = items.filter((i) => i.gate.toLowerCase().includes(opts.gate!.toLowerCase()));
  }

  if (opts.search && opts.search.trim() !== "") {
    const q = opts.search.toLowerCase().trim();
    items = items.filter((i) => i.name.toLowerCase().includes(q) || i.userId.toLowerCase().includes(q));
  }

  // Apply sorting
  const sortBy = opts.sortBy || "newest";
  if (sortBy === "oldest") {
    items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } else if (sortBy === "name_asc") {
    items.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === "name_desc") {
    items.sort((a, b) => b.name.localeCompare(a.name));
  } else {
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  const formattedData = items.map((scan) => ({
    Name: scan.name,
    "ID / Roll": scan.userId,
    Type: scan.personType.toUpperCase(),
    Department: scan.department,
    Direction: scan.direction,
    Gate: scan.gate,
    Timestamp: new Date(scan.timestamp).toLocaleString("en-IN"),
  }));

  const label = from === to ? `Report_${from}` : `Report_${from}_to_${to}`;

  if (format === "csv") {
    return generateCSV(
      formattedData.length > 0 ? formattedData : [{ Message: "No logs matching selected parameters" }],
      `gate_audit_${label}`
    );
  } else {
    const totalIn = items.filter((s) => s.direction === "IN").length;
    const totalOut = items.filter((s) => s.direction === "OUT").length;

    const activeFilterLabels = [];
    if (opts.department && opts.department !== "all") activeFilterLabels.push(`Dept: <strong>${opts.department}</strong>`);
    if (opts.personType && opts.personType !== "all") activeFilterLabels.push(`Role: <strong>${opts.personType}</strong>`);
    if (opts.direction && opts.direction !== "all") activeFilterLabels.push(`Direction: <strong>${opts.direction}</strong>`);
    if (opts.search) activeFilterLabels.push(`Search: <strong>${opts.search}</strong>`);

    const htmlContent = `
      <div class="header">
        <div>
          <h1 class="title">Campus Gate Access Audit Report</h1>
          <p class="subtitle">Official Gate Movement Telemetry & Occupancy Audit</p>
        </div>
        <div class="meta">
          <p><strong>Date Range:</strong> ${from} to ${to}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString("en-IN")}</p>
        </div>
      </div>

      ${
        activeFilterLabels.length > 0
          ? `<div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:8px 14px; font-size:11px; margin-bottom:20px;"><strong>Applied Filters:</strong> ${activeFilterLabels.join(" &bull; ")}</div>`
          : ""
      }

      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-num">${items.length}</div>
          <div class="summary-lbl">Matching Scans</div>
        </div>
        <div class="summary-card">
          <div class="summary-num" style="color: #15803d;">${totalIn}</div>
          <div class="summary-lbl">Entries (IN)</div>
        </div>
        <div class="summary-card">
          <div class="summary-num" style="color: #b91c1c;">${totalOut}</div>
          <div class="summary-lbl">Exits (OUT)</div>
        </div>
        <div class="summary-card">
          <div class="summary-num" style="color: #3b82f6;">${new Set(items.map((i) => i.userId)).size}</div>
          <div class="summary-lbl">Unique Persons</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Name</th>
            <th>ID / Roll</th>
            <th>Person Type</th>
            <th>Department</th>
            <th>Gate</th>
            <th>Direction</th>
          </tr>
        </thead>
        <tbody>
          ${
            formattedData.length > 0
              ? formattedData
                  .slice(0, 1000)
                  .map(
                    (row) => `
            <tr>
              <td>${row.Timestamp}</td>
              <td><strong>${row.Name}</strong></td>
              <td style="font-family: monospace;">${row["ID / Roll"]}</td>
              <td>${row.Type}</td>
              <td>${row.Department}</td>
              <td>${row.Gate}</td>
              <td>
                <span class="${row.Direction === "IN" ? "badge-in" : "badge-out"}">${row.Direction}</span>
              </td>
            </tr>
          `
                  )
                  .join("")
              : `<tr><td colspan="7" style="text-align:center; padding: 24px; color: #64748b;">No movement logs recorded for selected period (${from} to ${to}).</td></tr>`
          }
        </tbody>
      </table>

      <div class="footer">
        <p>Gate Monitor Campus Telemetry System &bull; Executive Audit Export &bull; ${items.length} Records</p>
      </div>
    `;
    return generatePDF(htmlContent, `gate_audit_${label}`);
  }
}
