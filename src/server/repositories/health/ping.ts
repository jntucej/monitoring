import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceClient } from "@/lib/dbClient";

export async function pingDatabase() {
    const dbClient = getSupabaseServiceClient();
    const { data, error } = await dbClient
      .from('users')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    
    if (error) throw error;
    return true;
}
