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
ENV SKIP_ENV_VALIDATION 1
ENV DOCKER_BUILD=true
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

# Ensure cache/config dirs exist and are owned by nextjs before the USER switch
RUN mkdir -p /app/.cache /app/.config && chown -R nextjs:nodejs /app

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

COPY --chown=nextjs:nodejs tsconfig.json ./tsconfig.json
COPY --chown=nextjs:nodejs worker ./worker
COPY --chown=nextjs:nodejs scripts ./scripts
COPY --chown=nextjs:nodejs src ./src

RUN mkdir -p /app/.cache /app/.config && chown -R nextjs:nodejs /app

USER nextjs
ENV HOME=/app
ENV XDG_CACHE_HOME=/app/.cache
ENV XDG_CONFIG_HOME=/app/.config

CMD ["node", "worker/index.mjs"]
