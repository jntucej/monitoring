// Area chart for source mix analysis
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export interface SourceMixAreaData {
  name: string;
  cloud: number;
  onPrem: number;
  hybrid: number;
}

export interface SourceMixAreaProps {
  data: SourceMixAreaData[];
  height?: number;
}

export function SourceMixArea({ data, height = 300 }: SourceMixAreaProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Area type="monotone" dataKey="cloud" stackId="a" stroke="#8884d8" fill="#8884d8" />
        <Area type="monotone" dataKey="onPrem" stackId="a" stroke="#82ca9d" fill="#82ca9d" />
        <Area type="monotone" dataKey="hybrid" stackId="a" stroke="#ffc658" fill="#ffc658" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
