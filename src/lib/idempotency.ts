import { query } from "@/lib/postgres";

export async function checkIdempotency(
  key: string | null | undefined,
  userId: string,
  endpoint: string
): Promise<{ cached: boolean; responseBody?: unknown; statusCode?: number }> {
  if (!key || typeof key !== "string" || !key.trim()) {
    return { cached: false };
  }

  try {
    const { rows } = await query<{
      response_body: unknown;
      status_code: number;
      expires_at: string;
    }>(
      `SELECT response_body, status_code, expires_at 
         FROM public.idempotency_keys 
        WHERE key = $1 AND user_id = $2 AND endpoint = $3 AND expires_at > NOW()
        LIMIT 1`,
      [key.trim(), userId, endpoint]
    );

    if (rows.length > 0) {
      return {
        cached: true,
        responseBody: rows[0].response_body,
        statusCode: rows[0].status_code,
      };
    }
  } catch {
    // Fail-open: if table does not exist or database error, proceed with normal execution
  }

  return { cached: false };
}

export async function storeIdempotency(
  key: string | null | undefined,
  userId: string,
  endpoint: string,
  responseBody: unknown,
  statusCode: number = 200,
  ttlHours: number = 24
): Promise<void> {
  if (!key || typeof key !== "string" || !key.trim()) {
    return;
  }

  try {
    await query(
      `INSERT INTO public.idempotency_keys (key, user_id, endpoint, response_body, status_code, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + ($6 || ' hours')::interval)
       ON CONFLICT (key) DO UPDATE 
         SET response_body = EXCLUDED.response_body,
             status_code   = EXCLUDED.status_code,
             expires_at    = EXCLUDED.expires_at`,
      [key.trim(), userId, endpoint, JSON.stringify(responseBody), statusCode, ttlHours]
    );
  } catch {
    // Best-effort storage
  }
}
