# Monitoring Setup Guide
## Unified Campus Access Management System

---

## 1. Overview

This guide covers setting up monitoring and health checks for the Campus Access Management System.

### Recommended Services
| Tool | Purpose | Integration |
|------|---------|-------------|
| **BetterStack** | Uptime monitoring | HTTP health checks (`/api/health`) |
| **Sentry** | Error tracking | Next.js SDK |
| **Logtail** | Log management | Structured logger |

---

## 2. Health Endpoint Monitoring

Target URL: `https://your-domain.com/api/health`

### Expected Health Payload:
```json
{
  "status": "healthy",
  "timestamp": "2026-08-19T10:00:00.000Z",
  "uptime": 86400,
  "components": {
    "database": { "status": "healthy", "latency": 12 },
    "gateways": { "online": 3, "offline": 0 }
  }
}
```
