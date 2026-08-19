import { supabase } from "./supabaseClient";

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
    filename: `${filename}_${new Date().toISOString().slice(0, 10)}.csv`,
  };
}

export async function generatePDF(content: string, filename: string) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${filename}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; background: #fff; color: #1a202c; }
    h1 { color: #1a202c; border-bottom: 2px solid #4299e1; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #2d3748; color: white; padding: 12px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
    tr:hover { background: #f7fafc; }
    .summary { background: #edf2f7; padding: 20px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;

  return {
    success: true,
    data: html,
    filename: `${filename}_${new Date().toISOString().slice(0, 10)}.html`,
  };
}

export async function exportDailyReport(date: string, format: "pdf" | "csv" = "csv") {
  const { data: scans } = await supabase
    .from("gate_logs")
    .select("*, persons(full_name, person_type, department)")
    .gte("timestamp", `${date}T00:00:00.000Z`)
    .lte("timestamp", `${date}T23:59:59.999Z`);

  if (!scans || scans.length === 0) {
    return { success: false, error: "No scan data found for this date", data: "", filename: "" };
  }

  const formattedData = scans.map(scan => ({
    Name: (scan.persons as any)?.full_name || scan.name || "Unknown",
    ID: scan.roll || scan.person_id || "",
    Type: (scan.persons as any)?.person_type || scan.person_type || "student",
    Department: (scan.persons as any)?.department || scan.department || "-",
    Direction: scan.direction || "IN",
    Gate: scan.gate_name || scan.gate_id || "Main Gate",
    Operator: scan.operator_name || "System",
    Time: new Date(scan.timestamp).toLocaleString(),
  }));

  if (format === "csv") {
    return generateCSV(formattedData, `daily_report_${date}`);
  } else {
    const htmlContent = `
      <h1>Daily Gate Access Report - ${date}</h1>
      <div class="summary">
        <p><strong>Total Entries (IN):</strong> ${scans.filter(s => s.direction === "IN").length}</p>
        <p><strong>Total Exits (OUT):</strong> ${scans.filter(s => s.direction === "OUT").length}</p>
        <p><strong>Total Access Scans:</strong> ${scans.length}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>ID</th>
            <th>Type</th>
            <th>Department</th>
            <th>Direction</th>
            <th>Gate</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          ${formattedData
            .map(
              row => `
            <tr>
              <td>${row.Name}</td>
              <td>${row.ID}</td>
              <td>${row.Type}</td>
              <td>${row.Department}</td>
              <td>${row.Direction}</td>
              <td>${row.Gate}</td>
              <td>${row.Time}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
    return generatePDF(htmlContent, `daily_report_${date}`);
  }
}
