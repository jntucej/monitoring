import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { buildClassRequestMetrics } from "@/lib/student/calendar";

async function handleGet(req: NextRequest) {
  const parts = new URL(req.url).pathname.split("/");
  const requestId = parts[parts.length - 2];
  const metrics = await buildClassRequestMetrics(requestId);
  if (!metrics) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const lines = ["roll_no,name,vote,voted_at"];
  for (const r of metrics.rows) {
    const safeName = `"${r.name.replace(/"/g, '""')}"`;
    lines.push(`${r.roll_no},${safeName},${r.vote},${r.voted_at}`);
  }

  return new NextResponse(lines.join("\n") + "\n", {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="class-request-${requestId}.csv"`,
    },
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "faculty", "hod", "dean", "admin", "sysadmin"],
});
