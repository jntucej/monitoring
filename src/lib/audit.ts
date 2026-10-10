import { query } from "@/lib/postgres";

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
  | 'PIN_CHANGED'
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
    const isUuid = !!log.userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(log.userId);
    const validUserId = isUuid ? log.userId : null;
    const details = { ...(log.details || {}), ...(!isUuid && log.userId ? { actor_identifier: log.userId } : {}) };
    await query(`
      INSERT INTO audit_logs (
        action, user_id, user_name, user_role, details, 
        ip_address, user_agent, timestamp
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      )
    `, [
      log.action,
      validUserId,
      log.userName,
      log.userRole,
      JSON.stringify(details),
      log.ipAddress,
      log.userAgent,
      log.timestamp || new Date().toISOString()
    ]);
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
  let queryText = `
    SELECT * FROM audit_logs 
    WHERE 1=1
  `;
  const params: any[] = [];
  
  if (filters.userId) {
    queryText += ` AND user_id = $${params.length + 1}`;
    params.push(filters.userId);
  }

  if (filters.action) {
    queryText += ` AND action = $${params.length + 1}`;
    params.push(filters.action);
  }

  if (filters.from) {
    queryText += ` AND timestamp >= $${params.length + 1}`;
    params.push(filters.from);
  }

  if (filters.to) {
    queryText += ` AND timestamp <= $${params.length + 1}`;
    params.push(filters.to);
  }

  queryText += ` ORDER BY timestamp DESC `;
  
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  
  queryText += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit);
  params.push(offset);

  let countQuery = `
    SELECT COUNT(*) as total FROM audit_logs 
    WHERE 1=1
  `;
  const countParams: any[] = [];
  
  if (filters.userId) {
    countQuery += ` AND user_id = $${countParams.length + 1}`;
    countParams.push(filters.userId);
  }

  if (filters.action) {
    countQuery += ` AND action = $${countParams.length + 1}`;
    countParams.push(filters.action);
  }

  if (filters.from) {
    countQuery += ` AND timestamp >= $${countParams.length + 1}`;
    countParams.push(filters.from);
  }

  if (filters.to) {
    countQuery += ` AND timestamp <= $${countParams.length + 1}`;
    countParams.push(filters.to);
  }

  try {
    const [dataResult, countResult] = await Promise.all([
      query(queryText, params),
      query(countQuery, countParams)
    ]);
    
    const logs: AuditLog[] = dataResult.rows.map((row: any) => ({
      id: row.id,
      action: row.action,
      userId: row.user_id,
      userName: row.user_name,
      userRole: row.user_role,
      details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      timestamp: row.timestamp
    }));
    
    return { 
      logs, 
      total: parseInt(countResult.rows[0]?.total || countResult.rows[0]?.count || '0', 10) 
    };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return { logs: [], total: 0 };
  }
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
