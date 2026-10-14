// Gauge chart for AI confidence scores
import { RadialBarChart, RadialBar, ResponsiveContainer, Legend } from 'recharts';

export interface AIConfidenceGaugeData {
  name: string;
  value: number;
  maxValue: number;
  color: string;
}

export interface AIConfidenceGaugeProps {
  data: AIConfidenceGaugeData[];
  height?: number;
}

export function AIConfidenceGauge({ data, height = 300 }: AIConfidenceGaugeProps) {
  const formattedData = data.map(item => ({
    ...item,
    value: item.value,
    name: item.name
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadialBarChart cx="50%" cy="50%" innerRadius={20} outerRadius={140} barSize={20} data={formattedData}>
        <RadialBar
          label={{ position: 'insideStart', fill: '#fff', fontSize: '12px' }}
          background
          dataKey="value"
        />
        <Legend
          iconType="circle"
          verticalAlign="bottom"
          wrapperStyle={{ fontSize: '12px' }}
        />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}
