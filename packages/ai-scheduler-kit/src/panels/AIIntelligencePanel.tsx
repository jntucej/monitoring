// AI Intelligence panel - displays AI insights and recommendations
import { Card } from '../primitives/Card';
import { ChartFrame } from '../primitives/ChartFrame';
import { Sparkline } from '../primitives/Sparkline';
import { useSchedulerData } from '../hooks/useSchedulerData';
import { MockAdapter } from '../lib/adapters/MockAdapter';

export function AIIntelligencePanel() {
  const { loading } = useSchedulerData({
    adapter: new MockAdapter(),
    autoFetch: true,
    refreshInterval: 15000
  });

  // Mock data for demonstration
  const confidenceData = [
    { name: 'AI Model 1', value: 95, maxValue: 100, color: '#10b981' },
    { name: 'AI Model 2', value: 87, maxValue: 100, color: '#3b82f6' },
    { name: 'AI Model 3', value: 92, maxValue: 100, color: '#8b5cf6' }
  ];

  const jobTrends = [
    { value: 65, date: '2024-01-01' },
    { value: 72, date: '2024-01-02' },
    { value: 68, date: '2024-01-03' },
    { value: 75, date: '2024-01-04' },
    { value: 80, date: '2024-01-05' },
    { value: 78, date: '2024-01-06' },
    { value: 85, date: '2024-01-07' }
  ];

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Confidence Scores */}
      <ChartFrame title="AI Model Confidence Scores" height={250}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {confidenceData.map((model, index) => (
            <div key={index} className="text-center">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                {model.name}
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {model.value}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Max: {model.maxValue}%
              </div>
            </div>
          ))}
        </div>
      </ChartFrame>

      {/* Job Trends */}
      <ChartFrame title="Job Scheduling Performance" height={250}>
        <Sparkline data={jobTrends} color="#10b981" height={180} />
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex justify-between mb-1">
            <span>Success Rate</span>
            <span>78%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full" style={{ width: '78%' }}></div>
          </div>
        </div>
      </ChartFrame>

      {/* Hint Acceptance */}
      <ChartFrame title="Hint Acceptance Rate" height={250}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">94%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Overall hint acceptance rate
            </div>
          </div>
        </div>
      </ChartFrame>
    </div>
  );
}
