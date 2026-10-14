// Skeleton loading placeholder
import { cn } from '../lib/cn';

export interface SkeletonProps {
  className?: string;
  lines?: number;
  height?: string;
}

export function Skeleton({ className, lines = 3, height = '20px' }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 bg-gray-200 dark:bg-gray-700 rounded"
          style={{ height }}
        />
      ))}
    </div>
  );
}
