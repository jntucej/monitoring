import { NextRequest, NextResponse } from "next/server";
import { addScan, isDuplicate } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { ScanDirection, ExitReason } from "@/lib/types";

interface ScanBody {
  roll: string;
  direction: ScanDirection;
  reason?: ExitReason;
  gateId: string;
  operatorId: string;
  isManual?: boolean;
}

async function handlePost(req: NextRequest) {
  try {
    const body: ScanBody = await req.json();
    const { roll, direction, reason, gateId, operatorId, isManual } = body;

    if (!roll || !direction || !gateId || !operatorId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Missing required fields" } },
        { status: 400 }
      );
    }

    // Check duplicate first (uses service client in db.ts)
    const duplicate = await    const duplicate = await    const duplicate = await    const duplicate = await    const duplicaes    const duplicate = await    const duplicate = awaitect    const duplicate = await    const duplicat

                                                                re                                                on                                                           ual:                   
             retu             retu                        retu uplic             ret:              retu    {             retu  );
  }  }  }  }  }  }  }  }  }  }  }  }  }  }  }proc  }  g s  }  }  }  }  }  }  }  }  }  }  }  }  }  } st  }  }  }  }  }  }  }  }  }  }  }  }  }  }  }proc  }  g s  }  }  }  }  }  spo  }  }  }  }  }  }  }  }  }  }  }  }  }  }  }proc  }  gNAL_ERROR", message } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["operator", "supervisor",  withAuthorization(handlePost, { requiredRole: ["operatxRequests: 60 }
);
