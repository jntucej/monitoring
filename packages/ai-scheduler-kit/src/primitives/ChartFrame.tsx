// Chart frame wrapper with loading and error states
import React from 'react';
import { cn } from '../lib/cn';
import { Card } from './Card';

export interface ChartFrameProps {
  title?: string;
  height?: number;
  loading?: boolean;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}

export function ChartFrame({ title, height = 300, loading = false, error, children, className }: ChartFrameProps) {
  if (loading) {
    return (
      <Card className={cn('flex items-center justify-center', className)} style={{ height }}>
        <div className="animate-pulse text-gray-400">Loading chart...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('flex items-center justify-center text-red-600', className)} style={{ height }}>
        <div>Error: {error}</div>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)} style={{ height }}>
      {title && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
      )}
      <div className="p-4 h-full">
        {children}
      </div>
    </Card>
  );
}
