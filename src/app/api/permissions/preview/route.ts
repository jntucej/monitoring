// src/app/api/permissions/preview/route.ts
// POST /api/permissions/preview — show the approval chain a new request of the
// given workflow type will walk through.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import {
  resolveInitialStage,
  WORKFLOW_STAGES,
} from "@/lib/permission-workflow";
import type { AuthContext } from "@/lib/authContext";
import type { WorkflowType } from "@/lib/types";

async function handlePost(
  req: NextRequest,
  _ctx: { auth: AuthContext },
): Promise<Response> {
  const { workflow_type } = (await req.json().catch(() => ({}))) as {
    workflow_type?: WorkflowType;
  };
  if (!workflow_type || !WORKFLOW_STAGES[workflow_type]) {
    return fail("VALIDATION_ERROR", "invalid workflow_type", 400);
  }

  return ok({
    workflow_type,
    initialStage: resolveInitialStage(workflow_type),
    chain: [...WORKFLOW_STAGES[workflow_type]],
  });
}

export const POST = withAuthorization(handlePost);
