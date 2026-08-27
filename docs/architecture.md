# System Architecture & Technical Specifications

## 1. High-Level Architecture
- **Framework**: Next.js 16 App Router (TypeScript, React 19, Turbopack).
- **Database**: Supabase (PostgreSQL with Row Level Security, composite indexes, read replicas).
- **Caching**: Dual-mode Redis / Memory TTL cache manager (`src/lib/cache.ts`).
- **Real-Time Streaming**: Server-Sent Events (SSE) & WebSocket turnstile streaming.
- **Monitoring**: Prometheus metrics collector (`/metrics`) with OpsGenie / Webhook alert dispatcher.

## 2. Security & Zero-Trust Model
- **Authentication**: JWT short-lived sessions with refresh rotation, WebAuthn passkeys, 2FA.
- **Authorization**: `withAuthorization` higher-order middleware protecting all API endpoints.
- **Replay Protection**: Nonce and timestamp signing on scan submissions.
- **IP Allowlisting**: Configurable IP subnet validation on admin routes.
