import { NextRequest, NextResponse } from "next/server";
import { findPersonByUniqueId } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/operator/lookup?id=24JJ1A0501
 *
 * Thin, read-only lookup endpoint for the operator desk's "Manual Entry"
 * section: resolves a name / roll / employee id against the users +
 * student_details + employee_details tables so the operator can display a
 * verification result card without needing the scan flow.
 *
 * Operator-tier only — mirrors the sibling operator routes.
 * Pure read: no writes, no mutations.
 */
async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    // Role gate: operator-tier roles only.
    if (!TIER.OPERATOR.includes(auth.role)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Lookup is only available to operator-tier roles." },
        },
        { status: 403 }
      );
    }

    const rawId = req.nextUrl.searchParams.get("id")?.trim() || "";
    if (!rawId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "BAD_REQUEST", message: "Query param ?id is required." },
        },
        { status: 400 }
      );
    }

    const person = await findPersonByUniqueId(rawId);
    if (!person) {
      return NextResponse.json(
        {
          success: true,
          data: { found: false, id: rawId.toUpperCase() },
        },
        { status: 200 }
      );
    }

    const studentDetails = person.studentDetails ?? null;
    const employeeDetails = person.employeeDetails ?? null;

    return NextResponse.json({
      success: true,
      data: {
        found: true,
        id: rawId.toUpperCase(),
        person: {
          id: person.id,
          name: person.fullName || person.name || "Unknown",
          uniqueId: person.uniqueId,
          personType: person.personType,
          status: person.status,
          department: studentDetails?.hostelBlock || person.department || null,
          year: studentDetails?.year ?? null,
          roomNumber: studentDetails?.roomNumber ?? null,
          designation: employeeDetails?.designation ?? null,
          onCampus: Boolean(person.checkedInAt && !person.checkedOutAt),
        },
      },
    });
  } catch (error) {
    console.error("Operator lookup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to look up person." },
      },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: TIER.OPERATOR }),
  { keyPrefix: "operator_lookup", maxRequests: 30 }
);

export const dynamic = "force-dynamic";
