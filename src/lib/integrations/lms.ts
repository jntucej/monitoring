import { getDbClient } from "@/lib/db";
import { LMSConfig, AttendanceRecord, SyncResult, getLMSProvider } from "./lms-provider";

export type { LMSConfig, AttendanceRecord, SyncResult };

export async function getLMSConfig(): Promise<LMSConfig> {
  try {
    const { data } = await getDbClient().from("lms_config").select("*").eq("id", "default").single();
    if (data) {
      return {
        platform: data.platform || "moodle",
        api_url: data.api_url || "https://moodle.campus.edu/webservice/rest/server.php",
        wstoken: data.wstoken || "",
        api_key_encrypted: data.api_key_encrypted || "",
        client_id: data.client_id || "",
        client_secret: data.client_secret || "",
        sync_schedule: data.sync_schedule || "daily_02:00",
        auto_push_attendance: data.auto_push_attendance ?? true,
        last_synced_at: data.last_synced_at || new Date().toISOString(),
        status: data.status || "connected",
      };
    }
  } catch {}

  return {
    platform: "moodle",
    api_url: "https://moodle.campus.edu/webservice/rest/server.php",
    sync_schedule: "daily_02:00",
    auto_push_attendance: true,
    last_synced_at: new Date().toISOString(),
    status: "connected",
  };
}

export async function updateLMSConfig(config: Partial<LMSConfig>): Promise<LMSConfig> {
  try {
    await getDbClient().from("lms_config").upsert({
      id: "default",
      platform: config.platform || "moodle",
      api_url: config.api_url,
      wstoken: config.wstoken,
      api_key_encrypted: config.api_key_encrypted,
      client_id: config.client_id,
      client_secret: config.client_secret,
      sync_schedule: config.sync_schedule,
      auto_push_attendance: config.auto_push_attendance,
      updated_at: new Date().toISOString(),
    });
  } catch {}

  return getLMSConfig();
}

export async function syncLMSRosters(): Promise<SyncResult> {
  const now = new Date().toISOString();

  try {
    const config = await getLMSConfig();
    const provider = getLMSProvider(config.platform);
    const result = await provider.syncRosters(config);

    await getDbClient().from("lms_config").upsert({
      id: "default",
      last_synced_at: now,
      status: result.errors.length ? "error" : "connected",
    });

    return result;
  } catch (error: any) {
    return {
      synced_courses: 0,
      synced_users: 0,
      errors: [error.message || "Failed to sync LMS rosters"],
    };
  }
}

export async function pushLMSAttendance(record: AttendanceRecord): Promise<boolean> {
  try {
    const config = await getLMSConfig();
    if (!config.auto_push_attendance) return false;

    try {
      await getDbClient().from("lms_attendance_logs").insert({
        user_id: record.userId,
        course_id: record.courseId || "default_course",
        timestamp: record.timestamp || new Date().toISOString(),
        status: record.status || "PRESENT",
        pushed_at: new Date().toISOString(),
      });
    } catch {}

    const provider = getLMSProvider(config.platform);
    return await provider.pushAttendance(config, record);
  } catch {
    return false;
  }
}


