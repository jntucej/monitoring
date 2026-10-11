/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";

// Alias: translates { stage: "hostel" | "gate" } into the PATCH action
async function handlePost(req: NextRequest, ctx: { auth: any }) {
  const body = await req.json().catch(() => ({}));
  const stage = body.stage as "hostel" | "gate" | undefined;
  if (stage !== "hostel" && stage !== "gate") {
    return Response.json(
      { success: false, error: { code: "BAD_REQUEST", message: "stage must be 'hostel' or 'gate'" } },
      { status: 400 },
    );
  }
  const action = stage === "hostel" ? "BIOMETRIC_HOSTEL" : "BIOMETRIC_GATE";
  // Forward to the PATCH handler with a synthesized request
  const url = new URL(req.url);
  url.pathname = url.pathname.replace(/\/biometric$/, "");
  const forwarded = new NextRequest(url, {
    method: "PATCH",
    headers: req.headers,
    body: JSON.stringify({ ...body, action }),
  });
  const { PATCH } = await import("../route");
  return (PATCH as any)(forwarded, ctx);
}

export const POST = withAuthorization(handlePost);
