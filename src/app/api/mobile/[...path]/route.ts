import { NextRequest, NextResponse } from "next/server";
import { findPersonByUniqueId, getPersonHistory } from "@/lib/db";
import { generateMobileToken, validateMobileToken } from "@/lib/mobile-auth";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  const path = params.path ? params.path.join("/") : "";

  // Mobile login route: POST /api/mobile/login
  if (path === "login") {
    try {
      const body = await req.json();
      const { uniqueId } = body;

      if (!uniqueId) {
        return NextResponse.json({ error: "Missing uniqueId" }, { status: 400 });
      }

      const person = await findPersonByUniqueId(uniqueId);
      if (!person) {
        return NextResponse.json({ error: "Person not found" }, { status: 404 });
      }

      const token = generateMobileToken(person.id, person.uniqueId);

      return NextResponse.json({
        token,
        person,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  const path = params.path ? params.path.join("/") : "";

  // Authenticate mobile request via Authorization header: Bearer <token>
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  const person = await validateMobileToken(token);

  if (!person) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // Mobile profile: GET /api/mobile/profile
  if (path === "profile") {
    return NextResponse.json({ person });
  }

  // Mobile history: GET /api/mobile/history
  if (path === "history") {
    const history = await getPersonHistory(person.id);
    return NextResponse.json({ history });
  }

  // Mobile digital ID: GET /api/mobile/idcard
  if (path === "idcard") {
    return NextResponse.json({
      uniqueId: person.uniqueId,
      fullName: person.fullName,
      personType: person.personType,
      department: person.department,
      designation: person.designation,
      photoUrl: person.photoUrl,
      qrCode: person.qrCode,
      status: person.status,
    });
  }

  return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
}
