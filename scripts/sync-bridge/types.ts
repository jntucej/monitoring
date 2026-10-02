export interface RawDeviceLog {
  deviceUserId: string;
  localTimestamp: string;
  verifyMode?: string;
  state?: number;
  meta?: Record<string, unknown>;
}

export interface ResolvedDeviceEvent {
  deviceSerial: string;
  deviceUserId: string;
  userId: string;
  localTimestamp: string;
  timestampUtc: string;
  direction: 'IN' | 'OUT';
  verifyMode?: string;
  meta?: Record<string, unknown>;
}

export interface AttendanceRecordMirror {
  dedupe_key: string;
  person_id: string;
  device_serial: string;
  direction: 'IN' | 'OUT';
  timestamp_utc: string;
  timestamp_local?: string;
  verify_mode_details?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}


export interface SyncRunSnapshot {
  startedAt: number;
  finishedAt: number;
  rawCount: number;
  resolvedCount: number;
  skippedUnmappedCount: number;
  movementLogInsertCount: number;
  attendanceRecordUpsertCount: number;
  attendanceRecordConflictCount: number;
  errors: string[];
}
