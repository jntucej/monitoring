
import { getSupabaseServiceClient } from "@/lib/dbClient";

export async function pingDatabase() {
    const dbClient = getSupabaseServiceClient();
    const { _data, error } = await dbClient
      .from('users')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    
    if (error) throw error;
    return true;
}
