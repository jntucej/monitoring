import { supabase } from './supabaseClient';

export interface BackupOptions {
  includeTables?: string[];
  excludeTables?: string[];
  anonymize?: boolean;
}

export interface BackupMetadata {
  id: string;
  filename: string;
  createdAt: string;
  size: number;
  tableCount: number;
  recordCount: number;
  createdBy: string;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
}

// Export database dump as JSON
export async function createDatabaseBackup(
  createdBy: string,
  options: BackupOptions = {}
): Promise<{ success: boolean; metadata?: BackupMetadata; data?: any; error?: string }> {
  try {
    const backupId = `backup_${Date.now()}`;
    const tablesToBackup = options.includeTables || [
      'persons',
      'student_details',
      'employee_details',
      'passes',
      'scans',
      'visitor_logs',
      'notifications',
      'gates',
      'audit_logs',
      'system_config',
    ];

    const backupData: Record<string, any[]> = {};
    let totalRecords = 0;

    for (const table of tablesToBackup) {
      if (options.excludeTables?.includes(table)) continue;

      const { data, error } = await supabase
        .from(table)
        .select('*');

      if (error) {
        console.error(`Error backing up table ${table}:`, error);
        continue;
      }

      let processedData = data || [];

      // Anonymize if requested
      if (options.anonymize && table === 'persons') {
        processedData = processedData.map(person => ({
          ...person,
          full_name: `User ${person.id.substring(0, 6)}`,
          email: `user_${person.id.substring(0, 6)}@anonymized.local`,
          phone: 'XXXXXXXXXX',
        }));
      }

      backupData[table] = processedData;
      totalRecords += processedData.length;
    }

    const metadata: BackupMetadata = {
      id: backupId,
      filename: `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
      createdAt: new Date().toISOString(),
      size: JSON.stringify(backupData).length,
      tableCount: Object.keys(backupData).length,
      recordCount: totalRecords,
      createdBy,
      status: 'completed',
    };

    // Log backup in metadata table
    await supabase
      .from('backups')
      .insert({
        id: metadata.id,
        filename: metadata.filename,
        created_at: metadata.createdAt,
        size: metadata.size,
        table_count: metadata.tableCount,
        record_count: metadata.recordCount,
        created_by: metadata.createdBy,
        status: metadata.status,
      });

    return {
      success: true,
      metadata,
      data: backupData,
    };
  } catch (error) {
    console.error('Error creating database backup:', error);
    return {
      success: false,
      error: String(error),
    };
  }
}

// Restore database from JSON backup
export async function restoreDatabaseBackup(
  backupData: Record<string, any[]>,
  options: { truncate?: boolean } = {}
): Promise<{ success: boolean; restoredTables: string[]; errors: string[] }> {
  const restoredTables: string[] = [];
  const errors: string[] = [];

  for (const [table, records] of Object.entries(backupData)) {
    try {
      if (options.truncate) {
        // Warning: This deletes existing data!
        await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }

      // Insert records in batches of 100
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error } = await supabase
          .from(table)
          .upsert(batch, { onConflict: 'id' });

        if (error) {
          errors.push(`Error inserting into ${table}: ${error.message}`);
        }
      }

      restoredTables.push(table);
    } catch (error) {
      errors.push(`Error restoring table ${table}: ${String(error)}`);
    }
  }

  return {
    success: errors.length === 0,
    restoredTables,
    errors,
  };
}

// List available backups
export async function listBackups(): Promise<BackupMetadata[]> {
  try {
    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing backups:', error);
      return [];
    }

    return (data || []).map(b => ({
      id: b.id,
      filename: b.filename,
      createdAt: b.created_at,
      size: b.size,
      tableCount: b.table_count,
      recordCount: b.record_count,
      createdBy: b.created_by,
      status: b.status,
      error: b.error,
    }));
  } catch (error) {
    console.error('Error listing backups:', error);
    return [];
  }
}
