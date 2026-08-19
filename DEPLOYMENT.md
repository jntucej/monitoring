# Production Deployment Guide
## Unified Campus Access Management System

---

## 1. System Requirements

### Minimum Specifications
| Component | Requirement |
|-----------|-------------|
| **Node.js** | v20.x or higher |
| **PostgreSQL** | v15.x or higher (Supabase recommended) |
| **RAM** | 4GB minimum, 8GB recommended |
| **Storage** | 20GB minimum |
| **CPU** | 2 cores minimum |

### Supported Platforms
- ✅ Vercel (Recommended)
- ✅ AWS (EC2, ECS, Amplify)
- ✅ Google Cloud Platform
- ✅ Azure
- ✅ Self-hosted (Docker/VM)

---

## 2. Environment Setup

### 2.1 Clone Repository
```bash
git clone <your-repository-url>
cd campus-access-management
npm install
```

### 2.2 Configure Environment Variables

Create `.env.production` file:

```env
# ============================================
# SUPABASE CONFIGURATION
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ============================================
# JWT AUTHENTICATION
# ============================================
JWT_SECRET=your-jwt-secret-min-32-chars

# ============================================
# SMS GATEWAY (Twilio)
# ============================================
SMS_ENABLED=true
SMS_PROVIDER=twilio
SMS_FROM=+1234567890
SMS_API_KEY=your-twilio-api-key
SMS_API_SECRET=your-twilio-api-secret

# ============================================
# EMAIL SERVICE (SendGrid)
# ============================================
EMAIL_ENABLED=true
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@campus.edu
EMAIL_FROM_NAME=Campus Access Management
EMAIL_API_KEY=your-sendgrid-api-key

# ============================================
# OPTIONAL: REDIS (Rate Limiting)
# ============================================
REDIS_URL=redis://localhost:6379

# ============================================
# OPTIONAL: FEATURE FLAGS
# ============================================
ENABLE_ATTENDANCE_SYNC=true
ENABLE_HR_SYNC=true
ENABLE_VISITOR_PRE_REG=true
ENABLE_EMERGENCY_BROADCAST=true
```

### 2.3 Database Setup

```bash
# 1. Apply all migrations
npx supabase db push --db-url $DATABASE_URL

# 2. Seed initial data (optional)
node scripts/seed-data.js

# 3. Verify migrations
npx supabase db pull
```

---

## 3. Deployment Options

### Option A: Vercel Deployment (Recommended)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel --prod
```

### Option B: Docker Deployment

**File: `Dockerfile`**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 4. Health Checks & Monitoring

### 4.1 Health Check Endpoint
```bash
curl https://your-domain.com/api/health
```

---

## 5. Security & Backups

Daily backups and SSL/TLS headers are configured via environment variables and background cron tasks.
