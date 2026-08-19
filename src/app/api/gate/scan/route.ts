import { NextRequest, NextResponse } from "next/server";
import { addScan, findGateById } from "@/lib/db";
import { withRateLimit } from "@/lib/rate-limit";
import { withAuthorization, logAuditEvent } from "@/middleware/authorization";
import { getGateStudent } from "@/middleware/authorization";
import { supabase } from '@/lib/supabaseClient';
import { ScanDirection } from '@/lib/types';

// Define Gate type based on the actual database schema
interface Gate {
  id: string;
  name: string;
  location: string;
  type: string;
  isActive: boolean;
  status?: string;
}

// Define the stats type based on the RPC function
interface TodayStats {
  onCampus?: number;
  todayIn?: number;
  todayOut?: number;
  totalScans?: number;
  [key: string]: any;
}

async function statsToday(): Promise<TodayStats> {
  const { data, error } = await supabase
    .rpc('get_today_stats')
    .single();

  if (error) throw error;
  return data || {};
}

async function findAllGates(): Promise<Gate[]> {
  const { data, error } = await supabase
    .from('gates')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Handle gate scan creation - SECURITY CRITICAL
 *
 * This endpoint implements the following security controls:
 * 1. Operator identity derived from authenticated session (not client-provided)
 * 2. Gate authorization validation
 * 3. Student access validation
 * 4. PII minimization
 * 5. Audit logging
 * 6. Rate limiting
 */
async function handlePost(req: NextRequest, { auth }: { auth: any }) {
  try {
    const body = await req.json();
    const { roll, direction, reason, gateId, isManual } = body;

    // Validate required fields
    if (!roll) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_STUDENT", message: "Student roll number is required" } },
        { status: 400 }
      );
    }

    if (!direction) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DIRECTION", message: "Direction must be IN or OUT" } },
        { status: 400 }
      );
    }

    if (direction === "OUT" && !reason) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_REASON", message: "Reason is required for OUT scans" } },
        { status: 400 }
      );
    }

    // Get minimal person information for gate verification
    const studentInfo = await getGateStudent(req, roll);

    // Validate time-based access control (e.g. worker shift hours)
    if (studentInfo.personType === "worker") {
      const { checkTimeBasedAccess } = await import("@/lib/access-control");
      const accessCheck = checkTimeBasedAccess("worker");
      if (!accessCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "WORKER_ACCESS_RESTRICTED",
              message: accessCheck.reason || "Worker entry/exit denied due to shift time restrictions",
            },
          },
          { status: 403 }
        );
      }
    }

    // Validate gate access if gateId is provided
    if (gateId) {
      // This validates that the operator can access this gate
      await validateGateAccess(req, gateId, auth);
    }

    // Determine the gate to use (client-provided or operator's default)
    const finalGateId = gateId || auth.gateId || "gate-1";

    // Validate the final gate ID
    const gate = await findGateById(finalGateId);
    if (!gate) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_GATE", message: "Gate not found" } },
        { status: 400 }
      );
    }

    // Validate gate status - use isActive from the actual schema
    if (!gate.isActive) {
      return NextResponse.json(
        { success: false, error: { code: "GATE_INACTIVE", message: "Gate is not active" } },
        { status: 403 }
      );
    }

    // Create the scan using authenticated operator identity
    const result = await addScan({
      roll,
      direction: direction as ScanDirection,
      reason,
      gateId: finalGateId,
      operatorId: auth.userId, // Use authenticated user ID instead of client-provided operatorId
      isManual: isManual || false,
    });

    if (result.duplicate) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_SCAN", message: "This student was already scanned recently. Please wait 5 minutes." } },
        { status: 429 }
      );
    }

    // Trigger notification
    try {
      const { sendNotification } = await import("@/lib/notification-service");
      const notifType = direction === "IN" ? "entry_recorded" : "exit_recorded";
      await sendNotification(
        notifType,
        studentInfo.id || roll,
        "person",
        {
          personName: studentInfo.name || roll,
          time: new Date().toLocaleTimeString(),
          gateName: gate.name,
        }
      );
    } catch (notifErr) {
      console.error("Failed to send scan notification:", notifErr);
    }

    // Get client IP address for audit logging
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null;

    // Log the successful scan for audit purposes
    await logAuditEvent(
      'GATE_SCAN',
      auth.userId,
      {
        studentId: studentInfo.id,
        roll,
        direction,
        reason,
        gateId: finalGateId,
        operatorId: auth.userId,
        isManual: isManual || false
      },
      ipAddress
    );

    return NextResponse.json({ success: true, data: result.scan });

  } catch (error) {
    console.error('Gate scan error:', error);

    // Get client IP address for audit logging
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null;

    // Log the failed scan attempt
    await logAuditEvent(
      'GATE_SCAN_FAILURE',
      auth.userId,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: ipAddress
      },
      ipAddress
    );

    if (error instanceof Error) {
      if (error.message.includes('UNAUTHORIZED')) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
          { status: 401 }
        );
      } else if (error.message.includes('FORBIDDEN')) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
          { status: 403 }
        );
      } else if (error.message.includes('NOT_FOUND')) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } },
          { status: 404 }
        );
      } else if (error.message.includes('INACTIVE_STUDENT')) {
        return NextResponse.json(
          { success: false, error: { code: 'INACTIVE_STUDENT', message: 'Student account is not active' } },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to record scan" } },
      { status: 500 }
    );
  }
}

/**
 * Validate gate access with proper authorization
 */
async function validateGateAccess(req: NextRequest, gateId: string, auth: any) {
  // Operators can only access gates they're assigned to
  if (auth.role === 'operator') {
    if (!auth.gateId || auth.gateId !== gateId) {
      throw new Error('FORBIDDEN: Not assigned to this gate');
    }
  }

  // Supervisors can access gates they supervise
  if (auth.role === 'supervisor') {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('supervised_gates')
      .eq('id', auth.userId)
      .single();

    if (userError || !user || !user.supervised_gates) {
      throw new Error('FORBIDDEN: No supervised gates');
    }

    if (!user.supervised_gates.includes(gateId)) {
      throw new Error('FORBIDDEN: Not supervising this gate');
    }
  }

  // Admins and system admins can access all gates
  if (!['admin', 'sysadmin', 'operator', 'supervisor'].includes(auth.role)) {
    throw new Error('FORBIDDEN: Insufficient permissions');
  }
}

/**
 * Handle gate statistics retrieval
 */
async function handleGet(req: NextRequest, { auth }: { auth: any }) {
  try {
    const stats = await statsToday();
    const gates = await findAllGates();

    // Filter gates based on user role and permissions
    let accessibleGates = gates;
    if (auth.role === 'operator' && auth.gateId) {
      accessibleGates = gates.filter(gate => gate.id === auth.gateId);
    } else if (auth.role === 'supervisor') {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('supervised_gates')
        .eq('id', auth.userId)
        .single();

      if (user && user.supervised_gates) {
        accessibleGates = gates.filter(gate => user.supervised_gates.includes(gate.id));
      }
    }

    // Create response data with proper typing
    const responseData: TodayStats & { gates: Gate[] } = {
      ...stats,
      gates: accessibleGates
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error loading scan stats:', error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load scan stats" } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(
  withAuthorization(handlePost, {
    requiredRole: ['operator', 'supervisor'],
    resourceType: 'gate',
    resourceIdParam: 'gateId',
    operation: 'create'
  }),
  { keyPrefix: 'gate_scan', maxRequests: 30 }
);

export const GET = withRateLimit(
  withAuthorization(handleGet, {
    requiredRole: ['operator', 'supervisor', 'admin', 'sysadmin']
  }),
  { keyPrefix: 'gate_stats', maxRequests: 60 }
);