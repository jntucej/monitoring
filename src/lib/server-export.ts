import { getDbClient } from "@/lib/db";
import { generateCSV, generatePDF, type ExportFilters } from "@/lib/export";

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
      .select("id, unique_id, name, role, department_id"),
  ]);

  const rawScans = (scansRes.data as Record<string, unknown>[]) || [];
  const userMap = new Map(((usersRes.data as Record<string, unknown>[]) || []).map((u) => [u.id as string, u]));

  let items = rawScans.map((scan) => {
    const user = userMap.get(scan.user_id as string);
    const deptCodeMap: Record<string, string> = {
      "01": "CIVIL", "02": "EEE", "03": "ME", "04": "ECE", "05": "CSE", "12": "IT"
    };
    const rawDept = (user?.department_id as string) || (user?.department as string) || (scan.department as string) || "";
    const dept = deptCodeMap[rawDept] || rawDept || "—";

    return {
      id: scan.id,
      userId: user?.unique_id || scan.user_id || scan.roll || "—",
      name: user?.name || scan.person_name || scan.name || "Unknown",
      role: user?.role || scan.person_type || "student",
      department: dept,
      direction: scan.direction || "OUT",
      gate: scan.gate_id || "Main Gate",
      reason: scan.reason || "General Outing",
      timestamp: scan.timestamp,
    };
  });

  if (opts.department) {
    items = items.filter((i) => i.department === opts.department);
  }
  if (opts.personType) {
    items = items.filter((i) => i.role === opts.personType);
  }
  if (opts.direction) {
    items = items.filter((i) => i.direction === opts.direction);
  }
  if (opts.gate) {
    items = items.filter((i) => i.gate === opts.gate);
  }
  if (opts.search) {
    const q = opts.search.toLowerCase();
    items = items.filter((i) => 
      String(i.name).toLowerCase().includes(q) || 
      String(i.userId).toLowerCase().includes(q)
    );
  }

  if (opts.sortBy) {
    switch (opts.sortBy) {
      case "oldest":
        items.sort((a, b) => new Date(a.timestamp as string).getTime() - new Date(b.timestamp as string).getTime());
        break;
      case "name_asc":
        items.sort((a, b) => String(a.name).localeCompare(String(b.name)));
        break;
      case "name_desc":
        items.sort((a, b) => String(b.name).localeCompare(String(a.name)));
        break;
      case "newest":
      default:
        items.sort((a, b) => new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime());
        break;
    }
  }

  const filename = `gate_activity_${from}_to_${to}`;

  if (format === "pdf") {
    const tableRows = items.map((i) => `
      <tr>
        <td>${i.timestamp ? new Date(i.timestamp as string).toLocaleString() : "—"}</td>
        <td><strong>${i.userId}</strong></td>
        <td>${i.name}</td>
        <td><span class="badge ${i.direction === "IN" ? "badge-in" : "badge-out"}">${i.direction}</span></td>
        <td>${i.gate}</td>
        <td>${i.department}</td>
        <td>${i.reason}</td>
      </tr>
    `).join("");

    const reportHtml = `
      <div class="header">
        <div>
          <h1 class="title">Campus Gate Activity Report</h1>
          <div class="subtitle">Range: ${from} to ${to} &bull; Generated: ${new Date().toLocaleString()}</div>
        </div>
      </div>
      <div class="stats">
        <div class="stat-card">
          <div class="stat-val">${items.length}</div>
          <div class="stat-lbl">Total Movements</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${items.filter((i) => i.direction === "OUT").length}</div>
          <div class="stat-lbl">Total Exits</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${items.filter((i) => i.direction === "IN").length}</div>
          <div class="stat-lbl">Total Entries</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>ID / Roll</th>
            <th>Name</th>
            <th>Direction</th>
            <th>Gate</th>
            <th>Department</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || "<tr><td colspan=\"7\" style=\"text-align:center;\">No movements found for this period</td></tr>"}
        </tbody>
      </table>
    `;

    return generatePDF(reportHtml, filename);
  }

  const csvData = items.map((i) => ({
    "Log ID": i.id,
    "Time": i.timestamp ? new Date(i.timestamp as string).toISOString() : "",
    "User ID / Roll": i.userId,
    "Full Name": i.name,
    "Role": i.role,
    "Department": i.department,
    "Direction": i.direction,
    "Gate": i.gate,
    "Reason": i.reason,
  }));

  return generateCSV(csvData, filename);
}
