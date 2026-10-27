// Sparkline chart component for small trend displays
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

export interface SparklineProps {
  data: { value: number; date?: string }[];
  color?: string;
  height?: number;
  smooth?: boolean;
}

export function Sparkline({ data, color = '#3b82f6', height = 40, smooth = true }: SparklineProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Area
          type={smooth ? 'natural' : 'linear'}
          dataKey="value"
          stroke={color}
          fill={color}
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
