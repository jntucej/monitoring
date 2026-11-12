FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund --prefer-offline || npm ci --legacy-peer-deps --no-audit --no-fund --prefer-offline

# Production-only dependencies for the runner stage. The builder stage uses
# the full tree above (needs devDeps for next build), but the runner ships
# only prod deps to avoid packaging jest/playwright/eslint/typescript.
FROM node:20-alpine AS prod-deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund --prefer-offline || npm ci --omit=dev --legacy-peer-deps --no-audit --no-fund --prefer-offline

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
ENV SKIP_ENV_VALIDATION 1
ENV DOCKER_BUILD=true
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
# Issue #400: create a writable home dir for the nextjs user. Without it, some
# Node libs (bcrypt native, pg SSL cert lookup, npm cache) try to write to a
# non-existent $HOME and fail with EACCES in edge-case paths.
RUN adduser --system --uid 1001 --home /app nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prod-only deps for server.js (standalone output prunes node_modules;
# bcryptjs/pg must be resolvable at runtime). Prod deps exclude devDeps
# (jest, playwright, eslint, typescript) — ~hundreds of MB smaller.
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# --- migrate support (migrate service runs scripts/migrate.ts) -----------
# The migrate one-shot service executes `npx tsx scripts/migrate.ts` inside
# this image. tsx is already a prod dependency, so it resolves in the
# runner. The script needs scripts/, database/ (migration SQL) and
# tsconfig.json; none of them were in the runner image before, so the
# migrate step could never find scripts/migrate.ts.
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/database ./database
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json

# Ensure cache/config/uploads dirs exist and are owned by nextjs before the USER switch
RUN mkdir -p /app/.cache /app/.config /app/data/uploads && chown -R nextjs:nodejs /app

USER nextjs

# Set HOME and XDG dirs so any library that writes to $HOME/.cache succeeds
ENV HOME=/app
ENV XDG_CACHE_HOME=/app/.cache
ENV XDG_CONFIG_HOME=/app/.config

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]

FROM node:20-alpine AS worker
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 --home /app nextjs

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# The auto-exec path (operator_actions.js -> apply-operator-action.sh) and
# the infra_snapshot_collector shell out to `bash`, `jq`, and `df`
# (--output=pcent, a GNU coreutils flag). node:20-alpine is BusyBox-only:
# no bash, no jq, no df --output. Without these the Tier-1 auto-actions
# silently fail and disk_free_pct is never captured (the forecaster's
# disk signal is blind). Add them to the worker image.
# C1: add psql (apply-operator-action.sh) + docker CLI (container restart /
# network inspect) so Tier-1 auto-actions run inside the worker image.
# BusyBox lacks GNU df, so coreutils is bundled under a virtual package.
RUN apk add --no-cache bash jq postgresql-client docker-cli \
    && apk add --no-cache --virtual .coreutils coreutils \
    && rm -rf /var/cache/apk/*

# COPY --chown=nextjs:nodejs tsconfig.json ./tsconfig.json
# COPY --chown=nextjs:nodejs worker ./worker
# COPY --chown=nextjs:nodejs scripts ./scripts
# COPY --chown=nextjs:nodejs src ./src

# C1: psql + docker CLI so apply-operator-action.sh and infra_snapshot_collector
# can exec `psql`/`docker` from inside the worker without a host-filesystem
# bind mount. docker socket is mounted read-only (restart / network inspect
# only; prune needs no host write).
# C4: use worker/package.json (slim dep set) instead of the full app tree —
# drops Next/React/three/recharts/remotion from the worker image.
COPY worker/package.json worker/package-lock.json* ./
RUN npm ci --omit=dev

COPY --chown=nextjs:nodejs worker ./worker
COPY --chown=nextjs:nodejs scripts ./scripts

RUN mkdir -p /app/.cache /app/.config && chown -R nextjs:nodejs /app

USER nextjs
ENV HOME=/app
ENV XDG_CACHE_HOME=/app/.cache
ENV XDG_CONFIG_HOME=/app/.config

# DR §7: the worker (nextjs user) writes status-last.json into the status_data
# volume every 60s so Caddy's static /status page can serve last-known-good
# when web is down. The status_data volume is chowned to nextjs:nextjs (1001)
# on first deploy via `docker run --rm -v compose_status_data:/s alpine chown -R 1001:1001 /s`.
CMD ["node", "worker/index.mjs"]
