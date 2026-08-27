# Deployment & Production Setup Guide

## 1. Prerequisites & Environment Variables
Configure `.env.local` or environment secrets:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
REDIS_URL=redis://localhost:6379 (optional)
JWT_SECRET=your-secure-jwt-secret
```

## 2. Database Migrations
Apply database migrations in order:
```bash
npx supabase db push
```

## 3. Build & Production Verification
```bash
npm run build
npm start
```
Verify compilation and health:
```bash
curl http://localhost:3000/api/health
```
