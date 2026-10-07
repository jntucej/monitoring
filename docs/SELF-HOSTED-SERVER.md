# Self-Hosted Deployment Guide (`docs/SELF-HOSTED-SERVER.md`)

## 1. Architecture Diagram

```
                 +-------------------+
                 |  Cloudflare Edge  |
                 +---------+---------+
                           | Encrypted Tunnel (HTTPS)
                           v
                 +-------------------+
                 |    cloudflared    |
                 |  (Tunnel Client)  |
                 +---------+---------+
                           | HTTP (:3000)
                           v
                 +-------------------+
                 |  Web (Next.js 16  |
                 |    Standalone)    |
                 +---+-----+-----+---+
                     |     |     |
         +-----------+     |     +-----------+
         |                 |                 |
         v                 v                 v
+-----------------+ +-------------+ +-----------------+
|  PostgreSQL 15  | |   Redis 7   | |  Worker Service |
|  (Data & Auth)  | | (Rate Limit)| | (Cron / Bridge) |
+-----------------+ +-------------+ +-----------------+
```

---

## 2. Prerequisites & WSL2 Setup

- **Host OS**: WSL2 Ubuntu 22.04 LTS on Windows 11 with Docker Desktop.
- **WSL2 Integration**: Enabled in Docker Desktop for Ubuntu 22.04.
- **Repository Path**: Stored on WSL2 filesystem (`~/gate-monitor`) to maximize I/O performance.
- **Cloudflare Tunnel**: Configured via Cloudflare Zero Trust dashboard.

---

## 3. Disk Budget & Partitioning

- **Estimate**: 3,000 students × 4 scans/day × 200 bytes ≈ 2.4 MB/day (~876 MB/year).
- **Partitioning**: `movement_logs` is partitioned monthly using Postgres declarative partitioning (`RANGE` on `timestamp`).
- **Pruning**: A background worker job drops partitions older than `RETENTION_DAYS` (default 365).

```sql
CREATE TABLE movement_logs (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID,
    gate_id UUID,
    timestamp TIMESTAMPTZ NOT NULL,
    direction VARCHAR(16),
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);
```


---

## 4. Full Working Container Files

### `Dockerfile`
```dockerfile
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]

FROM node:20-alpine AS worker
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --chown=nextjs:nodejs tsconfig.json ./tsconfig.json
COPY --chown=nextjs:nodejs worker ./worker
COPY --chown=nextjs:nodejs scripts ./scripts
COPY --chown=nextjs:nodejs src ./src

USER nextjs
CMD ["node", "worker/index.mjs"]
```

### `docker-compose.yml`
```yaml
services:
  postgres:
    image: postgres:15-alpine
    container_name: gate_postgres
    restart: always
    env_file: [.env]
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-gate_monitor}
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-gate_monitor}"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - gate-net

  redis:
    image: redis:7-alpine
    container_name: gate_redis
    restart: always
    env_file: [.env]
    command: ["redis-server", "--requirepass", "${REDIS_PASSWORD}"]
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - gate-net

  web:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    container_name: gate_web
    restart: always
    env_file: [.env]
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgres://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-gate_monitor}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - gate-net

  worker:
    build:
      context: .
      dockerfile: Dockerfile
      target: worker
    container_name: gate_worker
    restart: always
    env_file: [.env]
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-gate_monitor}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - gate-net

  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: gate_cloudflared
    restart: always
    env_file: [.env]
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    depends_on:
      - web
    networks:
      - gate-net

volumes:
  pgdata:
  redisdata:

networks:
  gate-net:
    driver: bridge
```


---

## 5. Environment Configuration (`.env.example`)

```env
NODE_ENV=production
PUBLIC_URL=https://gate.example.com
PUBLIC_HOST=gate.example.com

POSTGRES_DB=gate_monitor
POSTGRES_USER=postgres

# Generate with: openssl rand -hex 16
POSTGRES_PASSWORD=CHANGEME

# Generate with: openssl rand -hex 16
REDIS_PASSWORD=CHANGEME

# Generate with: openssl rand -hex 32
JWT_SECRET=CHANGEME

# Generate with: openssl rand -hex 32
MOBILE_TOKEN_SECRET=CHANGEME

# Cloudflare Tunnel Token from Cloudflare Zero Trust Dashboard
CLOUDFLARE_TUNNEL_TOKEN=CHANGEME

# Temporary v1 Supabase Compat Values (Delete after MIGRATION.md step 12)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 6. Background Worker Script (`worker/index.mjs`)

```javascript
import cron from 'node-cron';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('[Worker] Starting background worker supervisor...');

cron.schedule('0 2 * * *', async () => {
  console.log('[Worker] Running scheduled job: backfill_daily_stats');
  try {
    const job = await import('./jobs/backfill_daily_stats.js');
    if (job.default) await job.default();
  } catch (err) {
    console.error('[Worker] backfill_daily_stats failed:', err);
  }
});

cron.schedule('0 3 * * *', async () => {
  console.log('[Worker] Running scheduled job: cleanup_expired_passes');
  try {
    const job = await import('./jobs/cleanup_expired_passes.js');
    if (job.default) await job.default();
  } catch (err) {
    console.error('[Worker] cleanup_expired_passes failed:', err);
  }
});

cron.schedule('0 4 * * 0', async () => {
  console.log('[Worker] Running scheduled job: audit_log_rotation');
  try {
    const job = await import('./jobs/audit_log_rotation.js');
    if (job.default) await job.default();
  } catch (err) {
    console.error('[Worker] audit_log_rotation failed:', err);
  }
});

function startSyncBridge() {
  const bridgePath = path.resolve(__dirname, '../scripts/sync-bridge/index.ts');
  console.log(`[Worker] Spawning sync-bridge script: ${bridgePath}`);

  const child = spawn('npx', ['tsx', bridgePath], {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    console.warn(`[Worker] sync-bridge exited with code ${code}, signal ${signal}. Restarting in 5s...`);
    setTimeout(startSyncBridge, 5000);
  });

  child.on('error', (err) => {
    console.error('[Worker] sync-bridge spawn error:', err);
    setTimeout(startSyncBridge, 5000);
  });
}

startSyncBridge();

process.on('SIGTERM', () => {
  console.log('[Worker] Received SIGTERM, shutting down worker gracefully.');
  process.exit(0);
});
```

---

## 7. First-Boot & Seeding

```bash
cd ~/gate-monitor
cp .env.example .env
chmod 600 .env
nano .env # Set secure passwords and tunnel token

docker compose build --no-cache
docker compose up -d
docker compose ps

# Health check inside network
docker compose exec web wget -qO- http://localhost:3000/api/health
```

### Admin Seeding
```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('InitialAdminPassword123!', 10, (err, hash) => { console.log(hash); });"

docker exec -it gate_postgres psql -U postgres -d gate_monitor -c "
INSERT INTO users (id, unique_id, name, email, role, status, password_hash, login_identifier)
VALUES (
  gen_random_uuid(),
  'SYSADM-001',
  'System Administrator',
  'sysadmin@example.edu',
  'sysadmin',
  'ACTIVE',
  '<BCRYPT_HASH_HERE>',
  'SYSADM-001'
)
ON CONFLICT (unique_id) DO UPDATE SET password_hash = EXCLUDED.password_hash;
"
```
*(Change password immediately upon first login via `/api/auth/change-password`).*

---

## 8. Backups, Upgrades & Failure Modes

- **Nightly Backups**: Systemd timer running `pg_dump` to `/var/backups` with 14-day rotation.
- **Upgrades**: `git pull origin main && docker compose build --no-cache web worker && docker compose up -d --no-deps web worker`.

### Failure Modes Table
| Symptom | Root Cause | Resolution |
|---|---|---|
| **Tunnel connection refused** | Next.js `web` container not running | Check `docker compose logs web` |
| **`pgdata` fills 512GB SSD** | `prune_movement_logs` failing | Check worker logs & retention |
| **WSL2 clock drift** | Windows sleep desync | Restart WSL (`wsl --shutdown`) |

---

## 9. Security Checklist

- [ ] Cloudflare Tunnel token stored in `.env` with `chmod 600`.
- [ ] Docker Desktop WSL2 integration enabled for Ubuntu.
- [ ] Windows Firewall does not expose ports 3000, 5432, or 6379 directly.
- [ ] Unique random strings generated for all passwords and secrets.
- [ ] Nightly backup timer active and verified (`sudo systemctl list-timers`).
