// src/app/api/complaints/config/version/route.ts
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";

async function handleGet(_req: NextRequest) {
  return ok({ subsystem: "campus-governance-complaints", version: "2.0.0", schema: "additive" });
}
export const GET = withAuthorization(handleGet);
