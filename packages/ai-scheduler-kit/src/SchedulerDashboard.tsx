// Main scheduler dashboard component
import React from 'react';
import { DashboardGrid } from './layout/DashboardGrid';
import { AIIntelligencePanel } from './panels/AIIntelligencePanel';
import { Card } from './primitives/Card';
import { MetricCard } from './primitives/MetricCard';
import { ChartFrame } from './primitives/ChartFrame';
import { useSchedulerData } from './hooks/useSchedulerData';
import { MockAdapter } from './lib/adapters/MockAdapter';

export function SchedulerDashboard() {
  const { jobs, resources, conflicts, loading, error } = useSchedulerData({
    adapter: new MockAdapter(),
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
          Last updated: {new Date().toLocaleTimeString()}
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
          title="Conflicts Detected"
          value={conflicts.length}
          trend="down"
          trendValue="-3"
          icon="⚠️"
        />
        <MetricCard
          title="Resource Utilization"
          value="73%"
          trend="neutral"
          trendValue="stable"
          icon="📊"
        />
      </DashboardGrid>

      {/* Charts Row 1 */}
      <DashboardGrid columns={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }} gap="md">
        <ChartFrame title="Job Status Distribution" height={300}>
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              {jobHealthData.map((item, index) => (
                <div key={index} className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {item.status}
                    </span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ChartFrame>

        <ChartFrame title="Resource Usage" height={300}>
          <div className="h-full flex items-center justify-center">
            <div className="w-full space-y-4">
              {resourceUsageData.map((resource, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">
                      {resource.name}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {resource.usage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${resource.usage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ChartFrame>
      </DashboardGrid>

      {/* Charts Row 2 */}
      <DashboardGrid columns={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }} gap="md">
        <ChartFrame title="Deployment Source Mix" height={300}>
          <div className="h-full flex items-center justify-center">
            <div className="w-full h-full">
              {sourceMixData.map((month, index) => (
                <div key={index} className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 dark:text-gray-400">
                      {month.name}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <div
                      className="bg-blue-500 h-2 rounded-sm"
                      style={{ width: `${month.cloud}%`, flex: 1 }}
                    ></div>
                    <div
                      className="bg-green-500 h-2 rounded-sm"
                      style={{ width: `${month.onPrem}%`, flex: 1 }}
                    ></div>
                    <div
                      className="bg-purple-500 h-2 rounded-sm"
                      style={{ width: `${month.hybrid}%`, flex: 1 }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ChartFrame>

        <AIIntelligencePanel />
      </DashboardGrid>
    </div>
  );
}
