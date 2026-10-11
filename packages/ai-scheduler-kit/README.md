package ai-scheduler-kit

# AI Scheduler Dashboard — Cookie Cutter Kit

A stampable, reusable scaffold that generates dashboards/panels/charts with a single command.

## Overview

This package provides a comprehensive kit for building AI-powered scheduling dashboards with:

- **UI Primitives**: Cards, metric cards, sparklines, chart frames, skeletons
- **Data Adapters**: Mock (for development/testing) and Live (for production) implementations
- **Formatters**: Utilities for normalizing scheduler data
- **Custom Hooks**: For data fetching, real-time updates, and breakpoint detection
- **Charts**: Job health bars, hint acceptance donuts, AI confidence gauges, source mix areas
- **Panels**: AI intelligence panels and smart suggestion cards
- **Layout**: Dashboard grid and responsive panel components
- **Main Component**: Complete scheduler dashboard reference implementation

## Architecture

### Two-Layer Approach

1. **The Kit** (`packages/ai-scheduler-kit`) — Contains primitives, charts, hooks, adapters
2. **The Generator** (`plop`) — Stamps out new charts, panels, or full dashboards

### Core Components

```
src/
├── primitives/           # UI primitives (Card, MetricCard, Sparkline, ChartFrame, Skeleton)
├── hooks/               # Custom hooks (useSchedulerData, useSchedulerRealtime, useBreakpoint)
├── charts/              # Chart components (JobHealthBar, HintAcceptanceDonut, AIConfidenceGauge, SourceMixArea)
├── panels/              # Panel components (AIIntelligencePanel, SmartSuggestionCard)
├── layout/              # Layout components (DashboardGrid, ResponsivePanel)
├── lib/                 # Core utilities
│   ├── adapters/        # Data adapters (MockAdapter, LiveAdapter)
│   └── formatters/      # Data formatting utilities
└── SchedulerDashboard.tsx  # Main dashboard reference implementation
```

## Installation

```bash
# Add the package to your project
cd packages/ai-scheduler-kit
npm install
```

## Usage

### Basic Usage

```typescript
import { SchedulerDashboard } from 'ai-scheduler-kit';

// Render the main dashboard
function App() {
  return <SchedulerDashboard />;
}
```

### Using Individual Components

```typescript
import { Card, MetricCard, ChartFrame } from 'ai-scheduler-kit';

// Use individual primitives
<Card>
  <MetricCard title="Total Jobs" value="142" trend="up" />
</Card>

// Use chart frames
<ChartFrame title="Job Status" height={300}>
  {/* Chart content */}
</ChartFrame>
```

### Using Data Hooks

```typescript
import { useSchedulerData } from 'ai-scheduler-kit';

function MyComponent() {
  const { jobs, resources, conflicts, loading, error } = useSchedulerData({
    adapter: new MockAdapter(),
    autoFetch: true,
    refreshInterval: 15000
  });

  return (
    <div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          <h3>Jobs: {jobs.length}</h3>
          <h3>Resources: {resources.length}</h3>
          <h3>Conflicts: {conflicts.length}</h3>
        </div>
      )}
    </div>
  );
}
```

### Using Adapters

```typescript
import { MockAdapter, LiveAdapter } from 'ai-scheduler-kit';

// For development/testing
const mockAdapter = new MockAdapter();

// For production
const liveAdapter = new LiveAdapter(
  'https://api.example.com',
  'your-api-key'
);
```

## API Reference

### Adapters

#### SchedulerDataAdapter (Abstract Base Class)

Methods:
- `fetchJobs(params?): Promise<any[]>`
- `fetchJob(id: string): Promise<any>`
- `createJob(data: any): Promise<any>`
- `updateJob(id: string, data: any): Promise<any>`
- `deleteJob(id: string): Promise<void>`
- `fetchConflicts(params?): Promise<any[]>`
- `fetchResources(params?): Promise<any[]>`

#### MockAdapter

Mock implementation for development and testing with sample data.

#### LiveAdapter

Real API integration with authentication support.

### Formatters

#### SchedulerFormatter

Utilities for normalizing and formatting scheduler data.

### Custom Hooks

#### useSchedulerData

Hook for fetching and managing scheduler data with caching and refresh support.

#### useSchedulerRealtime

Hook for real-time scheduler updates via WebSocket.

#### useBreakpoint

Hook for breakpoint detection and responsive design.

### Components

#### Primitives

- `Card` - Basic container component
- `MetricCard` - Displays key metrics with trends
- `Sparkline` - Small trend line charts
- `ChartFrame` - Wrapper with loading and error states
- `Skeleton` - Loading placeholder components

#### Charts

- `JobHealthBar` - Bar chart showing job status distribution
- `HintAcceptanceDonut` - Donut chart for hint acceptance metrics
- `AIConfidenceGauge` - Radial gauge for AI confidence scores
- `SourceMixArea` - Area chart for deployment source analysis

#### Panels

- `AIIntelligencePanel` - Displays AI insights and recommendations
- `SmartSuggestionCard` - Individual AI suggestion cards

#### Layout

- `DashboardGrid` - Responsive grid layout
- `ResponsivePanel` - Breakpoint-specific panel behavior

### Main Component

`SchedulerDashboard` - Complete reference implementation showcasing all features.

## Development

### Generating Components

This kit includes a Plop generator for stamping out new components:

```bash
# Generate a new chart
npx plop chart
# Prompts: Chart name (PascalCase), Chart shape

# Generate a new panel
npx plop panel
# Prompts: Panel name (PascalCase), Panel title

# Generate a full dashboard
npx plop dashboard
# Prompts: Route name (kebab-case)
```

### Building

```bash
npm run build
```

### Development

```bash
npm run dev
```

## Project Structure

```
packages/ai-scheduler-kit/
├── src/
│   ├── primitives/           # UI primitives
│   ├── hooks/               # Custom hooks
│   ├── charts/              # Chart components
│   ├── panels/              # Panel components
│   ├── layout/              # Layout components
│   └── SchedulerDashboard.tsx  # Main dashboard
├── tsconfig.json            # TypeScript configuration
└── package.json            # Package configuration
```

## Features

- **Zero Dependencies**: Uses only Node built-ins
- **TypeScript**: Full type safety
- **Responsive Design**: Mobile-first approach
- **Themable**: CSS custom properties
- **Accessible**: ARIA compliant
- **Testable**: Component-driven architecture
- **Documented**: Complete API documentation
- **Reusable**: Stampable components
- **Type-safe**: Full TypeScript support

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT

## Links

- [GitHub Repository](https://github.com/jntucej/monitoring)
- [Documentation](https://hermes-agent.nousresearch.com/docs)
- [Issues](https://github.com/jntucej/monitoring/issues)

## Version

1.0.0
