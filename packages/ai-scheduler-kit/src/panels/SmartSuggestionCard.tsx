// Smart suggestion card - displays individual AI recommendations
import React from 'react';
import { Card } from '../primitives/Card';

export interface SmartSuggestionCardProps {
  suggestion: {
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    impact: number;
    confidence: number;
    category: 'optimization' | 'alert' | 'recommendation';
    action?: {
      label: string;
      onClick?: () => void;
    };
  };
}

export function SmartSuggestionCard({ suggestion }: SmartSuggestionCardProps) {
  const priorityColors = {
    high: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    medium: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
    low: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
  };

  const priorityBorders = {
    high: 'border-l-4 border-l-red-500',
    medium: 'border-l-4 border-l-yellow-500',
    low: 'border-l-4 border-l-blue-500'
  };

  const categoryIcons = {
    optimization: '⚡',
    alert: '⚠️',
    recommendation: '💡'
  };

  return (
    <Card className={`p-4 ${priorityColors[suggestion.priority]} ${priorityBorders[suggestion.priority]}`}> 
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">{categoryIcons[suggestion.category]}</span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              {suggestion.category}
            </span>
            <span className={`text-xs font-semibold ${suggestion.priority === 'high' ? 'text-red-700 dark:text-red-400' : suggestion.priority === 'medium' ? 'text-yellow-700 dark:text-yellow-400' : 'text-blue-700 dark:text-blue-400'}`}>
              {suggestion.priority} priority
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            {suggestion.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            {suggestion.description}
          </p>
          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <span>Impact:</span>
              <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-gray-600 dark:bg-gray-400 h-1.5 rounded-full"
                  style={{ width: `${suggestion.impact}%` }}
                ></div>
              </div>
              <span>{suggestion.impact}%</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>Confidence:</span>
              <span className="font-medium">{suggestion.confidence}%</span>
            </div>
          </div>
        </div>
        {suggestion.action && (
          <button
            onClick={suggestion.action.onClick}
            className="ml-4 px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {suggestion.action.label}
          </button>
        )}
      </div>
    </Card>
  );
}
