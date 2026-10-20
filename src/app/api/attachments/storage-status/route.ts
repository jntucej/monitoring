// src/app/api/attachments/storage-status/route.ts
// GET — admin diagnostic for complaint storage persistent volume status.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { getStorageStatus } from "@/lib/attachment-storage";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!["admin", "sysadmin", "principal"].includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }
  const status = await getStorageStatus();
  return ok(status);
}

export const GET = withAuthorization(handleGet);
