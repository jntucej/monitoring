UCEJ Monitoring System

## Overview
A production-grade monitoring system with role-based access control, scheduling, AI intelligence, and real-time data visualization.

## Features

### 🧠 AI Intelligence
- **Smart Scheduling** – AI-driven job optimization and conflict detection
- **Hint System** – Contextual suggestions and recommendations
- **Confidence Scoring** – AI reliability metrics and confidence levels

### 📊 Real-Time Visualization
- **Responsive Charts** – 12+ chart types, dark mode ready, a11y compliant
- **Live Data** – WebSocket/realtime updates with fallback polling
- **Timeline Views** – Schedule timelines and job execution history

### 🔐 Security & Access Control
- **Role-Based Gates** – Multi-tier access control with hierarchical permissions
- **Service Accounts** – Elevated access for internal services
- **Audit Trail** – Complete logging of all operations

### ⚡ Performance Optimized
- **Virtual Scrolling** – Efficient large dataset handling
- **Lazy Loading** – On-demand component loading
- **Compression** – Optimized assets and real-time data streams

## Technology Stack

### Frontend
- **Next.js 16** – React framework with server-side rendering
- **TypeScript** – Type-safe development
- **Tailwind CSS** – Utility-first styling
- **Recharts** – Production-ready charting library
- **WebSocket** – Real-time data synchronization

### Backend
- **Supabase** – PostgreSQL with Row Level Security
- **Node.js** – Server-side runtime
- **REST APIs** – RESTful API design

## Project Structure

### Core Components
```
├── src/
│   ├── app/                    # Next.js pages
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/             # UI components
│   ├── lib/                    # Core utilities
│   ├── hooks/                  # React hooks
│   └── styles/                 # CSS files
├── scripts/                    # Automation scripts
├── packages/                   # Shared packages
└── docs/                       # Documentation
```

### AI Scheduler Kit
```
├── packages/ai-scheduler-kit/    # Chart primitives and components
│   ├── src/
│   │   ├── charts/            # Chart components
│   │   ├── hooks/             # Custom hooks
│   │   ├── lib/               # Data layer
│   │   ├── primitives/        # UI primitives
│   │   └── panels/            # Dashboard panels
│   ├── templates/             # Generator templates
│   └── plopfile.mjs           # Plop generator configuration
└── ...                        # Python cookiecutter.json
```

## Getting Started

### Development Environment
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### AI Scheduler Kit Development
```bash
# Navigate to the package
cd packages/ai-scheduler-kit

# Install dependencies
npm install

# Generate a new component
npm run generate chart
npm run generate panel  
npm run generate dashboard
```

### Key Commands
```bash
# Initialize new project with AI Scheduler
python3 -m pip install cookiecutter
cookiecutter --template packages/ai-scheduler-kit .

# Start live data streaming
npm run realtime

# Generate UI audit report
npm run audit
```

## Configuration

### Environment Variables
```env
# Application configuration
NEXT_PUBLIC_API_URL=https://api.ucej.in
NEXT_PUBLIC_WS_URL=wss://api.ucej.in/realtime

# Authentication
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI/ML configuration
AI_MODEL_ENDPOINT=https://ai.ucej.in/v1/chat
AI_MODEL_KEY=your-ai-model-key

# Monitoring configuration
SENTRY_DSN=your-sentry-dsn
LOGGING_LEVEL=info
```

### Feature Flags
```typescript
// src/config/feature-flags.ts
export const featureFlags = {
  // AI/ML features
  enableAIModel: process.env.NEXT_PUBLIC_ENABLE_AI_MODEL === 'true',
  enableSmartSuggestions: process.env.NEXT_PUBLIC_ENABLE_SMART_SUGGESTIONS === 'true',
  
  // Real-time features
  enableWebSocket: process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET === 'true',
  enableRealtimeUpdates: process.env.NEXT_PUBLIC_ENABLE_REALTIME === 'true',
  
  // UI features
  enableDarkMode: process.env.NEXT_PUBLIC_ENABLE_DARK_MODE === 'true',
  enableReducedMotion: process.env.NEXT_PUBLIC_ENABLE_REDUCED_MOTION === 'true',
};
```

## Development Guide

### 1. Adding New Charts
Use the Plop generator to create new chart components:

```bash
npx plop chart
# Follow prompts to create new chart
```

### 2. Adding New Panels
Use the Plop generator to create new dashboard panels:

```bash
npx plop panel
# Follow prompts to create new panel
```

### 3. Adding New Dashboards
Use the Plop generator to create new dashboard pages:

```bash
npx plop dashboard
# Follow prompts to create new dashboard
```

### 4. Contributing
1. Fork the repository
2. Create a new branch
3. Implement your changes
4. Run tests
5. Submit a pull request

### 5. Testing
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e
```

## Performance

### Key Metrics
- **Initial Load Time**: < 2.5s (Lighthouse performance)
- **First Contentful Paint**: < 1.2s
- **Largest Contentful Paint**: < 2.8s
- **Cumulative Layout Shift**: < 0.05

### Optimizations
- **Code Splitting**: Automatic chunking with Next.js
- **Image Optimization**: Next.js Image component
- **Bundle Analysis**: Webpack bundle analyzer
- **Caching**: Edge caching with CDN

## Security

### Access Control
- **Role-Based Access Control**: Multi-tier permissions
- **Service Accounts**: Elevated access for internal services
- **API Rate Limiting**: Prevent abuse
- **Input Validation**: All inputs validated

### Data Protection
- **Encryption**: All sensitive data encrypted
- **Audit Logging**: Complete operation logging
- **Backup**: Regular automated backups
- **Recovery**: Disaster recovery procedures

## Monitoring

### Health Checks
```javascript
// src/monitoring/health-check.js
export async function performHealthCheck() {
  const checks = [
    { name: 'Database', check: () => checkDatabaseConnection() },
    { name: 'API', check: () => checkApiHealth() },
    { name: 'Cache', check: () => checkCacheHealth() },
    { name: 'Storage', check: () => checkStorageHealth() },
  ];
  
  const results = await Promise.allSettled(
    checks.map(async ({ name, check }) => {
      const result = await check();
      return { name, status: result ? 'healthy' : 'unhealthy', result };
    })
  );
  
  return results;
}
```

### Alerting
```typescript
// src/monitoring/alerting.ts
export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class AlertManager {
  private subscribers: ((alert: Alert) => void)[] = [];
  
  async send(alert: Alert): Promise<void> {
    // Send to monitoring system
    await this.sendToMonitoring(alert);
    
    // Notify subscribers
    this.notify(alert);
    
    // Handle critical alerts
    if (alert.severity === 'critical') {
      await this.handleCriticalAlert(alert);
    }
  }
  
  subscribe(callback: (alert: Alert) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }
  
  private notify(alert: Alert): void {
    this.subscribers.forEach(callback => callback(alert));
  }
}
```

## API Reference

### Authentication
```http
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}

Response: { "token": "jwt-token", "refreshToken": "refresh-token" }
```

### Jobs API
```http
GET /api/jobs
Query Parameters:
- status: "success" | "failure" | "running" | "queued" | "skipped" (optional)
- limit: number (optional, default: 100)
- offset: number (optional, default: 0)

Response: Array of Job objects

POST /api/jobs
{
  "name": "Job name",
  "schedule": "cron-expression",
  "config": {}
}

Response: Created job object
```

## Examples

### Example Dashboard
```typescript
// src/components/example-dashboard.tsx
export function ExampleDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard title="Total Jobs" value="142" trend="up" />
      <MetricCard title="Success Rate" value="98.7%" trend="up" />
      <MetricCard title="Active Conflicts" value="3" trend="down" />
      <MetricCard title="AI Confidence" value="91%" trend="up" />
    </div>
  );
}
```

### Example Chart
```typescript
// src/components/example-chart.tsx
export function ExampleChart({ data }: { data: ChartData[] }) {
  return (
    <ChartFrame title="System Performance" height={300} loading={loading} error={error}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <XAxis dataKey="date" />
          <YAxis />
          <Area dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
```

## Troubleshooting

### Common Issues

#### Issue: Charts not loading
1. Check browser console for JavaScript errors
2. Ensure Recharts is properly installed
3. Verify the chart container has dimensions
4. Check browser compatibility

#### Issue: Real-time updates not working
1. Verify WebSocket server is running
2. Check firewall settings
3. Ensure the client is authenticated
4. Verify network connectivity

#### Issue: Authentication failures
1. Check if the token is expired
2. Verify the authentication server is running
3. Check if the user has the required permissions
4. Ensure the authentication configuration is correct

### Getting Help

If you encounter issues:

1. **Check the logs**: `tail -f /var/log/ucej/monitoring.log`
2. **Run diagnostics**: `npm run diagnose`
3. **Check status**: `curl https://status.ucej.in/health`
4. **Report issues**: File an issue on GitHub

## Support

### Documentation
- [API Reference](/docs/api.md)
- [Development Guide](/docs/development.md)
- [Deployment Guide](/docs/deployment.md)

### Community
- **GitHub**: https://github.com/jntucej/monitoring
- **Discord**: https://discord.gg/jntucej
- **Twitter**: @jntucej

### Contact
- **Email**: support@jntucej.in
- **Phone**: +91-XXXXXXXXXX
- **Hours**: 24/7/365

---

*Last updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)*
*This documentation is auto-generated. For the latest updates, check the main repository.*

## AI Scheduler Dashboard — Cookiecutter

A **stampable, reusable scaffold** that can generate any number of dashboards/panels/charts with a single command.

### Two Layers:

1. **The Kit** (`packages/ai-scheduler-kit`) — primitives, charts, hooks, adapters
2. **The Generator** (`plop`) — stamps out new charts, panels, or full dashboards

### Example Commands:

```bash
# Generate a new chart
npx plop chart
#   → Chart name: OvertimeTrend
#   → Chart shape: area
#   ✓ created src/charts/OvertimeTrend.tsx

# Generate a new panel
npx plop panel
#   → Panel name: CapacityForecast
#   → Panel title: Predicted Capacity
#   ✓ created src/panels/CapacityForecast.tsx

# Generate a full dashboard
npx plop dashboard
#   → Route name: scheduler-v2
#   ✓ created app/scheduler-v2/page.tsx
```

### Installation:
```bash
# Use Python cookiecutter
python3 -m pip install cookiecutter
cookiecutter --template packages/ai-scheduler-kit .

# Or use Node.js generator
cd packages/ai-scheduler-kit
npm install
npx plop
```

See the full implementation in `packages/ai-scheduler-kit/` for complete details.



## 🔑 Role Credentials

All provisioned role login credentials (operator kiosk, principal, exam, hostel,
parent, mess-in-charge, warden, supervisor, student, plus supporting roles) are
documented in **[README_CREDENTIALS.md](./README_CREDENTIALS.md)**.
