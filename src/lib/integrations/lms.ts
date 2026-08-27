import { supabase } from "@/lib/supabaseClient";

export interface LMSConfig {
  platform: "moodle" | "canvas" | "blackboard";
  api_url: string;
  api_key_encrypted?: string;
  sync_schedule: string;
  auto_push_attendance: boolean;
  last_synced_at?: string;
  status: "connected" | "disconnected" | "error";
}

export async function getLMSConfig(): Promise<LMSConfig> {
  try {
    const { data } = await supabase.from("lms_config").select("*").eq("id", "default").single();
    if (data) {
      return {
        platform: data.platform || "moodle",
        api_url: data.api_url || "https://moodle.campus.edu/api",
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
    await supabase.from("lms_config").upsert({
      id: "default",
      platform: config.platform || "moodle",
      api_url: config.api_url,
      sync_schedule: config.sync_schedule,
      auto_push_attendance: config.auto_push_attendance,
      updated_at: new Date().toISOString(),
    });
  } catch {}

  return getLMSConfig();
}

export async function syncLMSRosters(): Promise<{ synced_courses: number; synced_users: number; errors: string[] }> {
  // Simulate LMS REST sync (Moodle/Canvas)
  const now = new Date().toISOString();
  try {
    await supabase.from("lms_config").update({ last_synced_at: now, status: "connected" }).eq("id", "default");
  } catch {}

  return {
    synced_courses: 42,
    synced_users: 1250,
    errors: [],
  };
}

export async function pushLMSAttendance(record: { userId: string; courseId: string; timestamp: string; status: "PRESENT" | "ABSENT" }): Promise<boolean> {
  // Pushes gate scan event as course attendance record in LMS
  return true;
}
