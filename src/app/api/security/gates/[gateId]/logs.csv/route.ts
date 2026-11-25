import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { getActiveShift } from "@/lib/security/shift";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const parts = new URL(req.url).pathname.split("/");
  const gateId = parts[parts.length - 2];

  if (auth.role === "operator") {
    const shift = await getActiveShift(auth.userId);
    if (!shift || shift.gate_id !== gateId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const { rows } = await query<{
    timestamp: string;
    roll_no: string | null;
    person_name: string | null;
    direction: string | null;
    category: string | null;
    gate_name: string | null;
    operator_name: string | null;
    outcome: string | null;
    curfew_violation: boolean | null;
  }>(
    `SELECT ml.timestamp::text, u.unique_id AS roll_no, u.name AS person_name,
            ml.direction, ml.category, ml.gate_name, ml.operator_name,
            ml.outcome, ml.curfew_violation
       FROM public.movement_logs ml
       LEFT JOIN public.users u ON u.id = ml.user_id
      WHERE ml.gate_id = $1::uuid
      ORDER BY ml.timestamp DESC
      LIMIT 1000`,
    [gateId],
  );

  const lines = ["timestamp,roll_no,person_name,direction,category,gate_name,operator_name,outcome,curfew_violation"];
  for (const r of rows) {
    const safeName = `"${(r.person_name ?? "").replace(/"/g, '""')}"`;
    const safeGate = `"${(r.gate_name ?? "").replace(/"/g, '""')}"`;
    const safeOp = `"${(r.operator_name ?? "").replace(/"/g, '""')}"`;
    lines.push(
      `${r.timestamp},${r.roll_no ?? ""},${safeName},${r.direction ?? ""},${r.category ?? ""},${safeGate},${safeOp},${r.outcome ?? ""},${Boolean(r.curfew_violation)}`,
    );
  }

  return new NextResponse(lines.join("\n") + "\n", {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gate-${gateId}-logs.csv"`,
    },
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["operator", "supervisor", "principal", "hod", "dean", "admin", "sysadmin"],
});
