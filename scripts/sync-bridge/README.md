# H0201 Biometric Sync Bridge

Background worker that pulls attendance events from an SBTS H0201 terminal and writes them into the Gate Monitor Supabase project.

## What it does

1. Connects to the H0201 terminal and pulls raw attendance log rows.
2. Resolves device-side `device_user_id` (e.g. `"101"`) to Supabase `users.id` using `public.device_user_mappings`.
3. Writes each resolved event to two sinks:
   - `public.movement_logs` (primary sink; triggers occupancy, daily stats, audit via existing schema triggers)
   - `public.attendance_records` (mirror sink for HR sync continuity)

Unmapped device user ids are skipped and counted. The worker never force-inserts unknown device-side identities into FK-constrained tables.

## Architecture note

This is a standalone long-running worker. It is intentionally outside the Next.js request lifecycle.

The TCP 4370 adapter is an explicit boundary. Today it includes a deterministic mock fallback so the rest of the bridge can be tested without a physical device. The real proprietary ZK-derivative protocol handler belongs in the same boundary and should replace the mock once the device protocol is confirmed.

## Workers vs Next.js API routes

Do not run this inside Next.js API routes or serverless functions. Use one of:

- PM2
- systemd service
- Docker container with restart policy
- Kubernetes job / sidecar
- Hosted worker platform

## Environment

Copy `.env.example` to `.env.local` (or your worker's env source).

Required:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BIOMETRIC_DEVICE_SERIAL`
- `BIOMETRIC_DEVICE_HOST`

Optional:

- `BIOMETRIC_DEVICE_PORT`
- `SYNC_INTERVAL_MS`
- `BIOMETRIC_DEVICE_USE_TCP`
- `BIOMETRIC_DEVICE_TCP_TIMEOUT_MS`
- `USE_FAKE_DEVICE_LOGS`

## Run

```bash
npm install
npm run sync-bridge
```

Or directly:

```bash
node scripts/sync-bridge/index.ts
```

If you use tsx or ts-node, adjust the run command accordingly.

## Mapping setup

Before the worker can resolve events, enroll fingerprints on the H0201 terminal and insert mapping rows.

Example:

```sql
INSERT INTO public.device_user_mappings (
  device_serial,
  device_user_id,
  user_id,
  is_active
) VALUES (
  '1241920440010',
  '101',
  '<uuid-of-the-user-with-roll-22011A0501>',
  true
);
```

## Failure behavior

- Unmapped device user ids are skipped and logged.
- Partial write failures are logged per run; the worker continues polling.
- If the device is unreachable, the worker retries on the next interval.
- If Supabase is unreachable, the worker logs the failure and retries on the next interval.

## Security

- Use the service-role key only in this worker.
- Do not expose this worker to the public internet.
- Treat `device_user_mappings` as the trust anchor between device-side ids and Supabase identities.
