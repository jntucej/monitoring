// Metric card for displaying key metrics with trends
import React from 'react';
import { cn } from '../lib/cn';
import { Card } from './Card';

export interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  loading?: boolean;
}

export function MetricCard({ title, value, trend, trendValue, icon, loading = false }: MetricCardProps) {
  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-600 dark:text-gray-400'
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→'
  };

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
        {icon && <div className="ml-4 text-gray-400">{icon}</div>}
      </div>
      {(trend || trendValue) && (
        <div className="mt-3 flex items-center">
          <span className={cn('text-sm font-medium', trendColors[trend || 'neutral'])}>
            {trendIcons[trend || 'neutral']} {trendValue || ''}
          </span>
        </div>
      )}
    </Card>
  );
}
