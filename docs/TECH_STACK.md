# Technology Stack & Infrastructure Architecture

## ⚡ GATE MONITOR: Core Tech Stack & Infrastructure Guide

**Document Version:** 2.0.0  
**Target Organization:** JNTUH College of Engineering Jagtial (JNTUH CEJ)  
**Status:** Production Stack Specification  
**Classification:** Technical Infrastructure & Dependency Mapping  

---

## 1. Executive Summary & Stack Strategy

The **Gate Monitor** technology stack is engineered for low-latency responsiveness, high concurrency, strict type safety, and seamless mobile responsiveness. By combining **Next.js 16 (App Router)** with **Supabase (PostgreSQL with Realtime)** and **Tailwind CSS 4**, the platform achieves sub-300ms verification speeds and offline-first capabilities for gate guards.

```
┌──────────────────────────────────────────────────────────────────┐
│                      FRONTEND & CLIENT LAYER                     │
│  - Next.js 16 (App Router & Server Components)                   │
│  - React 19 & Tailwind CSS 4 & Framer Motion                      │
│  - Zustand 5 (Client & Offline State Management)                │
│  - Lucide React Icons & Radix UI Primitives                      │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                      BACKEND & API LAYER                         │
│  - Next.js API Routes (Serverless & Edge Runtimes)               │
│  - TypeScript 5 (End-to-End Type Safety)                         │
│  - @simplewebauthn (FIDO2 / WebAuthn Biometrics)                │
│  - Jose & BcryptJS (JWT & Password Cryptography)                │
│  - Rate-Limiter-Flexible (DDoS & Brute Force Guard)             │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                  DATABASE & INFRASTRUCTURE LAYER                 │
│  - Supabase PostgreSQL (Managed Relational Database & RLS)      │
│  - Supabase Realtime (WebSocket Streaming Engine)                │
│  - Vercel Edge Network (Edge Middleware & CDN Global Host)       │
│  - Playwright Framework (E2E Test Automation)                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Comprehensive Core Technology Stack

### 2.1 Core Framework & Language

| Category | Technology | Version | Purpose & Architectural Rationale |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js | `16.3.1` | Next-gen full-stack framework with React Server Components, App Router, and Edge middleware capabilities. |
| **UI Library** | React | `19.2.8` | Modern concurrent rendering UI engine powering dynamic operator dashboards and interactive views. |
| **Language** | TypeScript | `^5.0.0` | Strict static typing across front-end models, API routes, database schemas, and shared interfaces. |

### 2.2 Frontend & UI Libraries

| Package | Version | Purpose |
| :--- | :--- | :--- |
| `tailwindcss` / `@tailwindcss/postcss` | `^4.0.0` | Utility-first CSS framework for rapid responsive component design. |
| `lucide-react` | `^1.31.0` | Comprehensive lightweight icon set for accessible UI elements. |
| `framer-motion` | `^13.1.0` | Fluid animations for modal dialogs, status banners, and scan flashes. |
| `recharts` | `^3.10.1` | Responsive charts for occupancy trends, exit analytics, and hourly traffic. |
| `zustand` | `^5.0.15` | Micro state-management store for auth sessions, operator UI state, and offline queues. |
| `clsx` & `tailwind-merge` | `^2.1.1` / `^3.6.0` | Conditional class name composition and Tailwind CSS class deduplication. |

---

## 3. Security, Authentication & Cryptography

| Package | Version | Architectural Role |
| :--- | :--- | :--- |
| `@simplewebauthn/browser` | `^13.3.0` | Hardware biometric registration & FIDO2 passkey challenge handling on client devices. |
| `@simplewebauthn/server` | `^13.3.3` | Server-side WebAuthn assertion verification and credential validation. |
| `jose` | `^6.2.9` | High-performance JSON Web Token (JWT) signing, verification, and session claims handling. |
| `bcryptjs` | `^3.0.3` | Cryptographic salted hashing for user credentials and operator access PINs. |
| `crypto-js` | `^4.2.0` | Client-side dynamic TOTP and QR signature generation helpers. |
| `rate-limiter-flexible` | `^11.2.0` | In-memory and Redis-ready rate limiting protecting API routes from brute-force attacks. |

---

## 4. Hardware Scanner & QR Utilities

| Package | Version | Architectural Role |
| :--- | :--- | :--- |
| `jsqr` | `^1.4.0` | High-speed JavaScript QR code decoder working directly on camera video frames. |
| `qrcode` / `qrcode.react` | `^1.5.4` / `^4.2.0` | Dynamic SVG/Canvas QR code generation for digital student ID cards. |
| `react-qrcode-logo` | `^4.1.0` | Institutional logo-branded QR code generator for institutional passes. |

---

## 5. Database, Backend & Infrastructure Architecture

### 5.1 Supabase PostgreSQL Database
* **Database Engine:** PostgreSQL 15+ hosted on Supabase Cloud.
* **Row Level Security (RLS):** Table-level isolation policies ensuring students only read their own passes, wardens access hostel wards, and operators write gate logs.
* **Database Driver:** `@supabase/supabase-js` (`^2.112.3`) for unified REST and Realtime WebSocket subscriptions.
* **Connection Pooling:** PgBouncer connection pooler optimized for serverless Next.js API routes.

### 5.2 Server & Middleware Architecture
* **Edge Middleware (`src/middleware/`):** Route guards (`auth.ts`), role authorization (`authorization.ts`), CSRF protection (`csrf.ts`), and metrics collectors (`metrics.ts`).
* **Realtime Streaming:** Server-Sent Events (SSE) route at `/api/occupancy/stream` pushing instant occupancy changes to connected dashboards.

---

## 6. QA Automation & Development Tooling

| Tool | Version | Application |
| :--- | :--- | :--- |
| `@playwright/test` | `^1.62.1` | End-to-end user journey test suite verifying gate scanning, login, and pass workflows. |
| `eslint` / `eslint-config-next` | `^9.0.0` / `16.3.1` | Automated static code quality linting. |
| `clean_md.py` & `fix_types.py` | Python Scripts | Automated workspace code hygiene & documentation formatting tools. |

| `date-fns` | `^4.4.0` | Immutable date arithmetic and formatting for curfew windows and pass expiration. |
