// Donut chart for hint acceptance metrics
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export interface HintAcceptanceDonutData {
  name: string;
  value: number;
  color: string;
}

export interface HintAcceptanceDonutProps {
  data: HintAcceptanceDonutData[];
  height?: number;
}

export function HintAcceptanceDonut({ data, height = 300 }: HintAcceptanceDonutProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
