import { getDbClient } from "@/lib/db";

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'PASS_CREATED'
  | 'PASS_APPROVED'
  | 'PASS_REJECTED'
  | 'SCAN_CREATED'
  | 'GATE_SCAN_RECORDED'
  | 'SCAN_CORRECTED'
  | 'VISITOR_CHECK_IN'
  | 'VISITOR_CHECK_OUT'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'ROLE_CHANGED'
  | 'PERMISSION_CHANGED'
  | 'SYSTEM_CONFIG_CHANGED'
  | 'DATA_EXPORTED'
  | 'BACKUP_CREATED'
  | 'BACKUP_RESTORED'
  | 'EMERGENCY_BROADCAST'
  | 'GATE_OFFLINE'
  | 'GATE_ONLINE'
  | 'SMART_SCHEDULE_APPLIED'
  | 'CRON_REPORTS_EXECUTED'
  | 'BACK_GATE_GEO_MISMATCH';


export interface AuditLog {
  id?: string;
  action: AuditAction;
  userId: string;
  userName: string;
  userRole: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: string;
}

// Log an audit event
export async function logAuditEvent(log: AuditLog): Promise<boolean> {
  try {
    const { error } = await getDbClient()
      .from('audit_logs')
      .insert({
        action: log.action,
        user_id: log.userId,
        user_name: log.userName,
        user_role: log.userRole,
        details: log.details,
        ip_address: log.ipAddress,
        user_agent: log.userAgent,
        timestamp: log.timestamp || new Date().toISOString(),
      });

    if (error) {
      console.error('Error logging audit event:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in logAuditEvent:', error);
    return false;
  }
}

// Get audit logs with filters
export async function getAuditLogs(filters: {
  userId?: string;
  action?: AuditAction;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: AuditLog[]; total: number }> {
  let query = getDbClient()
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('timestamp', { ascending: false });

  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters.action) {
    query = query.eq('action', filters.action);
  }

  if (filters.from) {
    query = query.gte('timestamp', filters.from);
  }

  if (filters.to) {
    query = query.lte('timestamp', filters.to);
  }

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching audit logs:', error);
    return { logs: [], total: 0 };
  }

  return { 
    logs: data || [], 
    total: count || 0 
  };
}

// Helper function to create audit context from request
export function createAuditContext(req: Request) {
  return {
    ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] || 
                req.headers.get('x-real-ip') || 
                'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
  };
}
