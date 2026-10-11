// src/components/shared/ChartRenderer.tsx
// SCAFFOLD:CHART — 8-type chart renderer. Idempotent: regenerate with
// `node scripts/scaffold-analytics.mjs new <feature> --force` to update.
"use client";

import React from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, Legend, ComposedChart, RadialBarChart, RadialBar,
} from "recharts";

export type ChartType =
  | "line" | "area" | "bar" | "composed"
  | "radar" | "scatter" | "pie" | "radial";

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
  type?: "line" | "area" | "bar";
}

export const CHART_PALETTE = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16",
];

const AXIS = {
  stroke: "var(--text-muted)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

const TOOLTIP = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--text-primary)",
};

export function ChartRenderer({
  type, data, series, xKey, height = 280, stacked = false,
}: {
  type: ChartType;
  data: any[];
  series: SeriesDef[];
  xKey: string;
  height?: number;
  stacked?: boolean;
}) {
  if (type === "pie") {
    const key = series[0]?.key ?? "value";
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey={key} nameKey={xKey} cx="50%" cy="50%"
               innerRadius={60} outerRadius={105} paddingAngle={3} stroke="none">
            {data.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === "radial") {
    const key = series[0]?.key ?? "value";
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RadialBarChart data={data} innerRadius="20%" outerRadius="95%"
                        startAngle={90} endAngle={-270}>
          <RadialBar dataKey={key} cornerRadius={8} background>
            {data.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
          </RadialBar>
          <Tooltip contentStyle={TOOLTIP} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </RadialBarChart>
      </ResponsiveContainer>
    );
  }

  if (type === "radar") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey={xKey} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
          <PolarRadiusAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
          {series.map((s) => (
            <Radar key={s.key} name={s.label} dataKey={s.key}
                   stroke={s.color} fill={s.color} fillOpacity={0.35} />
          ))}
          <Tooltip contentStyle={TOOLTIP} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  if (type === "scatter") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} {...AXIS} />
          <YAxis {...AXIS} />
          <ZAxis range={[60, 220]} />
          {series.map((s) => (
            <Scatter key={s.key} name={s.label} data={data} dataKey={s.key} fill={s.color} />
          ))}
          <Tooltip contentStyle={TOOLTIP} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (type === "composed") {
    const [first, ...rest] = series;
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} {...AXIS} />
          <YAxis {...AXIS} />
          <Tooltip contentStyle={TOOLTIP} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {first && (
            <Area type="monotone" dataKey={first.key} name={first.label}
                  stroke={first.color} fill={first.color} fillOpacity={0.25} />
          )}
          {rest.map((s) => s.type === "bar" ? (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[6, 6, 0, 0]} />
          ) : (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label}
                  stroke={s.color} strokeWidth={2.5} dot={{ r: 3 }} />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  if (type === "bar") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} {...AXIS} />
          <YAxis {...AXIS} />
          <Tooltip contentStyle={TOOLTIP} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color}
                 radius={[6, 6, 0, 0]} stackId={stacked ? "stack" : undefined} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === "area") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={0.75} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} {...AXIS} />
          <YAxis {...AXIS} />
          <Tooltip contentStyle={TOOLTIP} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.label}
                  stroke={s.color} fill={`url(#grad-${s.key})`}
                  stackId={stacked ? "stack" : undefined} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  /* default: line */
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey={xKey} {...AXIS} />
        <YAxis {...AXIS} />
        <Tooltip contentStyle={TOOLTIP} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.label}
                stroke={s.color} strokeWidth={2.5}
                dot={{ r: 3 }} activeDot={{ r: 5 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default ChartRenderer;
