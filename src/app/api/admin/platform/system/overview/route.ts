import { type NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

interface SystemSettingRow {
  id: string;
  value: unknown;
  updated_at: string;
}

interface SchemaMigrationRow {
  version: string;
  applied_at: string;
  filename: string | null;
  checksum: string | null;
}

interface SystemItem {
  id: string;
  [k: string]: unknown;
}

export const GET = withRateLimit(
  withAuthorization(
    async (_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> => {
      let settings: SystemSettingRow[] = [];
      let migrations: SchemaMigrationRow[] = [];

      try {
        const [settingsRes, migrationsRes] = await Promise.all([
          query<SystemSettingRow>(`
            SELECT
              id,
              value,
              updated_at::text AS updated_at
            FROM public.system_settings
            ORDER BY id ASC
          `),
          query<SchemaMigrationRow>(`
            SELECT
              version,
              applied_at::text AS applied_at,
              filename,
              checksum
            FROM public.schema_migrations
            ORDER BY applied_at DESC
            LIMIT 5
          `),
        ]);

        settings = settingsRes.rows;
        migrations = migrationsRes.rows;
      } catch {
        settings = [];
        migrations = [];
      }

      const items: SystemItem[] = settings.map((s) => ({
        id: s.id,
        value: s.value,
        updated_at: s.updated_at,
      }));

      return ok({
        settings,
        migrations,
        items,
      });
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { windowMs: 60000, maxRequests: 60 }
);
