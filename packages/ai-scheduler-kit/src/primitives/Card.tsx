// Card primitive - basic container component
import React from 'react';
import { cn } from '../lib/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  rounded?: boolean;
}

export function Card({ className, padding = 'md', shadow = 'md', rounded = true, ...props }: CardProps) {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg'
  };

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800',
        rounded && 'rounded-lg',
        paddingClasses[padding],
        shadowClasses[shadow],
        'transition-all duration-200',
        className
      )}
      {...props}
    />
  );
}
