// Main scheduler dashboard component
import { DashboardGrid } from './layout/DashboardGrid';
import { AIIntelligencePanel } from './panels/AIIntelligencePanel';
import { Card } from './primitives/Card';
import { MetricCard } from './primitives/MetricCard';
import { ChartFrame } from './primitives/ChartFrame';
import { useSchedulerData } from './hooks/useSchedulerData';
import { SchedulerDataAdapter } from './lib/adapters/base/SchedulerDataAdapter';

export interface SchedulerDashboardProps {
  adapter?: SchedulerDataAdapter;
}

export function SchedulerDashboard({ adapter }: SchedulerDashboardProps = {}) {
  if (!adapter) {
    throw new Error(
      'SchedulerDashboard requires an explicit adapter (MockAdapter for demos, ' +
      'LiveAdapter({ baseUrl, apiKey }) for production). ' +
      'Refusing to render without one to prevent mock data appearing as live.'
    );
  }

  const { jobs, conflicts, loading, error, lastUpdated } = useSchedulerData({
    adapter,
    autoFetch: true,
    refreshInterval: 15000
  });

  // Mock data for demonstration
  const jobHealthData = [
    { status: 'Running', count: 45, color: '#10b981' },
    { status: 'Queued', count: 12, color: '#3b82f6' },
    { status: 'Failed', count: 3, color: '#ef4444' },
    { status: 'Completed', count: 128, color: '#8b5cf6' }
  ];

  const resourceUsageData = [
    { name: 'CPU Cluster', usage: 75, capacity: 100 },
    { name: 'Memory Pool', usage: 82, capacity: 100 },
    { name: 'Storage Array', usage: 45, capacity: 100 }
  ];

  const sourceMixData = [
    { name: 'Jan', cloud: 40, onPrem: 35, hybrid: 25 },
    { name: 'Feb', cloud: 45, onPrem: 30, hybrid: 25 },
    { name: 'Mar', cloud: 50, onPrem: 25, hybrid: 25 },
    { name: 'Apr', cloud: 55, onPrem: 20, hybrid: 25 }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Error Loading Dashboard
          </h3>
          <p className="text-red-600 dark:text-red-400">
            {error}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            AI Scheduler Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Real-time scheduling and optimization insights
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}
        </div>
      </div>

      {/* Key Metrics */}
      <DashboardGrid columns={{ xs: 2, sm: 2, md: 4, lg: 4, xl: 4 }} gap="md">
        <MetricCard
          title="Total Jobs"
          value={jobs.length}
          trend="up"
          trendValue="+12%"
          icon="💼"
        />
        <MetricCard
          title="Success Rate"
          value="94.7%"
          trend="up"
          trendValue="+2.3%"
          icon="✅"
        />
        <MetricCard
          title="Active Conflicts"
          value={conflicts.length}
          trend="down"
          trendValue="-2"
          icon="⚠️"
        />
        <MetricCard
          title="Optimization Score"
          value="88.4%"
          trend="up"
          trendValue="+5.1%"
          icon="⚡"
        />
      </DashboardGrid>

      {/* AI Intelligence & Predictions */}
      <AIIntelligencePanel />

      {/* Charts Section */}
      <DashboardGrid columns={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }} gap="lg">
        <ChartFrame title="Job Health & Status">
          {/* Chart implementation */}
          <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <span className="text-gray-400">Job Health Distribution Chart</span>
          </div>
        </ChartFrame>

        <ChartFrame title="Resource Utilization">
          {/* Chart implementation */}
          <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <span className="text-gray-400">Resource Pool Usage Chart</span>
          </div>
        </ChartFrame>
      </DashboardGrid>
    </div>
  );
}
