// Dashboard grid layout component
import React from 'react';
import { useBreakpoint } from '../hooks/useBreakpoint';

export interface DashboardGridProps {
  children: React.ReactNode;
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function DashboardGrid({
  children,
  columns = { xs: 1, sm: 2, md: 2, lg: 3, xl: 4 },
  gap = 'md',
  className = ''
}: DashboardGridProps) {
  const { breakpoint } = useBreakpoint();

  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };

  const getColumnClass = () => {
    switch (breakpoint) {
      case 'xs': return `grid-cols-${columns.xs}`;
      case 'sm': return `grid-cols-${columns.sm}`;
      case 'md': return `grid-cols-${columns.md}`;
      case 'lg': return `grid-cols-${columns.lg}`;
      case 'xl': return `grid-cols-${columns.xl}`;
      case '2xl': return `grid-cols-${columns.xl}`;
      default: return `grid-cols-${columns.lg}`;
    }
  };

  return (
    <div className={`grid ${getColumnClass()} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}
