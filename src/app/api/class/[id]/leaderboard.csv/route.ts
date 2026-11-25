import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import type { AuthContext } from "@/lib/authContext";
import { listForClass } from "@/lib/student/leaderboard";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const parts = new URL(req.url).pathname.split("/");
  const classId = decodeURIComponent(parts[parts.length - 2]);
  const res = await listForClass(classId, auth.userId, auth.role);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }

  const lines = ["roll_no,full_name,attendance_pct,marks_pct,achievement_count"];
  for (const r of res.rows) {
    const safeName = `"${r.full_name.replace(/"/g, '""')}"`;
    lines.push(`${r.roll_no},${safeName},${r.attendance_pct},${r.marks_pct},${r.achievement_count}`);
  }

  return new NextResponse(lines.join("\n") + "\n", {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leaderboard-${classId}.csv"`,
    },
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "faculty", "hod", "dean", "principal", "admin", "sysadmin"],
});
