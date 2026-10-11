// Responsive panel wrapper with breakpoint-specific behavior
import React from 'react';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { Card } from '../primitives/Card';

export interface ResponsivePanelProps {
  children: React.ReactNode;
  breakpoint?: {
    xs?: React.ReactNode;
    sm?: React.ReactNode;
    md?: React.ReactNode;
    lg?: React.ReactNode;
    xl?: React.ReactNode;
  };
  className?: string;
}

export function ResponsivePanel({ children, breakpoint, className }: ResponsivePanelProps) {
  const { breakpoint: currentBreakpoint } = useBreakpoint();

  const getContent = () => {
    if (breakpoint && breakpoint[currentBreakpoint]) {
      return breakpoint[currentBreakpoint];
    }
    return children;
  };

  return (
    <Card className={`p-4 ${className}`}>
      {getContent()}
    </Card>
  );
}
