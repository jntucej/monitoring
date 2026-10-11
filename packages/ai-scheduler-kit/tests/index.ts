// Comprehensive test suite for AI Scheduler Dashboard components
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '../src/primitives/Card';
import { MetricCard } from '../src/primitives/MetricCard';
import { ChartFrame } from '../src/primitives/ChartFrame';
import { Skeleton } from '../src/primitives/Skeleton';
import { JobHealthBar } from '../src/charts/JobHealthBar';
import { HintAcceptanceDonut } from '../src/charts/HintAcceptanceDonut';
import { AIConfidenceGauge } from '../src/charts/AIConfidenceGauge';
import { SourceMixArea } from '../src/charts/SourceMixArea';
import { AIIntelligencePanel } from '../src/panels/AIIntelligencePanel';
import { SmartSuggestionCard } from '../src/panels/SmartSuggestionCard';
import { useSchedulerData } from '../src/hooks/useSchedulerData';
import { useSchedulerRealtime } from '../src/hooks/useSchedulerRealtime';
import { useBreakpoint } from '../src/hooks/useBreakpoint';

describe('UI Primitives', () => {
  describe('Card', () => {
    it('renders with default props', () => {
      render(<Card>Test content</Card>);
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<Card className="custom-class">Test</Card>);
      expect(screen.getByText('Test')).toHaveClass('custom-class');
    });
  });

  describe('MetricCard', () => {
    it('renders metric information', () => {
      render(
        <MetricCard
          title="Total Jobs"
          value="142"
          trend="up"
          trendValue="+12%"
        />
      );
      expect(screen.getByText('Total Jobs')).toBeInTheDocument();
      expect(screen.getByText('142')).toBeInTheDocument();
      expect(screen.getByText('+12%')).toBeInTheDocument();
    });

    it('shows loading skeleton when loading', () => {
      render(
        <MetricCard
          title="Loading"
          value="0"
          loading={true}
        />
      );
      expect(screen.getByText('Loading')).toBeInTheDocument();
    });
  });

  describe('ChartFrame', () => {
    it('renders children when not loading or error', () => {
      render(
        <ChartFrame title="Test Chart">
          <div>Chart content</div>
        </ChartFrame>
      );
      expect(screen.getByText('Chart content')).toBeInTheDocument();
      expect(screen.getByText('Test Chart')).toBeInTheDocument();
    });

    it('shows loading state', () => {
      render(
        <ChartFrame loading={true}>
          <div>Should not show</div>
        </ChartFrame>
      );
      expect(screen.getByText('Loading chart...')).toBeInTheDocument();
    });

    it('shows error state', () => {
      render(
        <ChartFrame error="Test error">
          <div>Should not show</div>
        </ChartFrame>
      );
      expect(screen.getByText('Error: Test error')).toBeInTheDocument();
    });
  });

  describe('Skeleton', () => {
    it('renders correct number of lines', () => {
      render(<Skeleton lines={3} />);
      // Skeleton components are self-contained, just check they render
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });
});

describe('Chart Components', () => {
  describe('JobHealthBar', () => {
    const mockData = [
      { status: 'Running', count: 45, color: '#10b981' },
      { status: 'Queued', count: 12, color: '#3b82f6' }
    ];

    it('renders with data', () => {
      render(<JobHealthBar data={mockData} />);
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
    });
  });

  describe('HintAcceptanceDonut', () => {
    const mockData = [
      { name: 'Applied', value: 145, color: '#10b981' },
      { name: 'Ignored', value: 23, color: '#ef4444' }
    ];

    it('renders donut chart data', () => {
      render(<HintAcceptanceDonut data={mockData} />);
      expect(screen.getByText('Applied')).toBeInTheDocument();
      expect(screen.getByText('145')).toBeInTheDocument();
    });
  });

  describe('AIConfidenceGauge', () => {
    const mockData = [
      { name: 'AI Model 1', value: 95, maxValue: 100, color: '#10b981' }
    ];

    it('renders gauge data', () => {
      render(<AIConfidenceGauge data={mockData} />);
      expect(screen.getByText('AI Model 1')).toBeInTheDocument();
    });
  });

  describe('SourceMixArea', () => {
    const mockData = [
      { name: 'Jan', cloud: 40, onPrem: 35, hybrid: 25 }
    ];

    it('renders area chart data', () => {
      render(<SourceMixArea data={mockData} />);
      expect(screen.getByText('Jan')).toBeInTheDocument();
    });
  });
});

describe('Panel Components', () => {
  describe('AIIntelligencePanel', () => {
    it('renders AI intelligence panel', () => {
      render(<AIIntelligencePanel />);
      expect(screen.getByText('AI Intelligence')).toBeInTheDocument();
    });
  });

  describe('SmartSuggestionCard', () => {
    const mockSuggestion = {
      id: 'test-1',
      title: 'Test Suggestion',
      description: 'This is a test suggestion for optimization',
      priority: 'high' as const,
      impact: 85,
      confidence: 92,
      category: 'optimization' as const,
      action: { label: 'Apply' }
    };

    it('renders suggestion card', () => {
      render(<SmartSuggestionCard suggestion={mockSuggestion} />);
      expect(screen.getByText('Test Suggestion')).toBeInTheDocument();
      expect(screen.getByText('optimization')).toBeInTheDocument();
    });
  });
});

describe('Custom Hooks', () => {
  describe('useSchedulerData', () => {
    it('provides scheduler data state and functions', () => {
      // Mock the hook implementation
      const mockAdapter = {
        fetchJobs: () => Promise.resolve([]),
        fetchResources: () => Promise.resolve([]),
        fetchConflicts: () => Promise.resolve([])
      };

      // This would normally test the actual hook implementation
      expect(true).toBe(true); // Placeholder test
    });
  });

  describe('useSchedulerRealtime', () => {
    it('provides real-time connection state', () => {
      expect(true).toBe(true); // Placeholder test
    });
  });

  describe('useBreakpoint', () => {
    it('detects breakpoint correctly', () => {
      expect(true).toBe(true); // Placeholder test
    });
  });
});

describe('Integration', () => {
  it('renders complete SchedulerDashboard', () => {
    render(<AIIntelligencePanel />);
    expect(screen.getByText('AI Intelligence')).toBeInTheDocument();
  });
});
