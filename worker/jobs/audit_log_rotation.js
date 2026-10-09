import { query } from '../db.js';

/**
 * Scheduled Job: Audit Log Rotation and Retention Enforcement.
 * Automatically archives/purges historical audit logs, expired integration logs,
 * and old resolved alerts beyond retention windows.
 */
export default async function auditLogRotation() {
  console.log('[Worker Job] Starting audit log rotation...');
  const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '180', 10);
  const integrationLogRetentionDays = parseInt(process.env.INTEGRATION_LOG_RETENTION_DAYS || '30', 10);
  const alertRetentionDays = parseInt(process.env.ALERT_RETENTION_DAYS || '90', 10);

  try {
    // 1. Purge old audit logs past retention threshold
    const auditRes = await query(
      `DELETE FROM audit_logs 
       WHERE timestamp < NOW() - ($1 || ' days')::INTERVAL`,
      [retentionDays]
    );
    console.log(`[Worker Job] Purged ${auditRes.rowCount || 0} audit logs older than ${retentionDays} days.`);

    // 2. Purge old integration sync logs
    const intRes = await query(
      `DELETE FROM integration_logs 
       WHERE timestamp < NOW() - ($1 || ' days')::INTERVAL`,
      [integrationLogRetentionDays]
    );
    console.log(`[Worker Job] Purged ${intRes.rowCount || 0} integration logs older than ${integrationLogRetentionDays} days.`);

    // 3. Purge old resolved security alerts
    const alertRes = await query(
      `DELETE FROM security_alerts 
       WHERE resolved = TRUE 
         AND created_at < NOW() - ($1 || ' days')::INTERVAL`,
      [alertRetentionDays]
    );
    console.log(`[Worker Job] Purged ${alertRes.rowCount || 0} resolved security alerts older than ${alertRetentionDays} days.`);

    // 4. Record rotation completion into audit trail
    await query(
      `INSERT INTO audit_logs (id, action, user_id, user_name, user_role, details, timestamp)
       VALUES (gen_random_uuid(), 'AUDIT_LOG_ROTATION_COMPLETED', NULL, 'Background Worker', 'sysadmin', $1::jsonb, NOW())`,
      [JSON.stringify({ message: `Rotated logs: ${auditRes.rowCount || 0} audit entries, ${intRes.rowCount || 0} integration logs, ${alertRes.rowCount || 0} alerts.` })]
    );

    console.log('[Worker Job] Audit log rotation completed successfully.');
  } catch (err) {
    console.error('[Worker Job Error] Audit log rotation failed:', err.message);
  }
}

