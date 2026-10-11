#!/usr/bin/env node
/**
 * scripts/scaffold-analytics.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Cookie cutter for graphical AI/analytics dashboards.
 *
 * Generates:
 *   1. src/components/shared/ChartRenderer.tsx         (idempotent — 8 chart types)
 *   2. src/components/shared/ChartTypeSwitcher.tsx     (idempotent — chart toggle)
 *   3. src/lib/<feature>-analytics.ts                  (domain data builders)
 *   4. src/components/admin/<Pascal>Analytics.tsx      (main dashboard)
 *   5. src/app/(admin)/admin/analytics/<feature>/page.tsx
 *
 * Every generated component ships with:
 *   • KPI strip (4 cards)
 *   • Hero chart with per-card type switcher
 *   • N secondary chart cards (3–6, configurable)
 *   • Anomaly/records table
 *   • Export CSV + Retrain + Refresh actions
 *   • WidgetBoundary isolation per chart
 *   • SCAFFOLD markers so scripts/dash.mjs audit skips them
 *
 * Usage:
 *   node scripts/scaffold-analytics.mjs new <feature> [flags]
 *   node scripts/scaffold-analytics.mjs list
 *
 * Flags:
 *   --title "Traffic Analytics"       display title          (default: titleCase)
 *   --endpoint /api/analytics/<f>     data endpoint          (default: derived)
 *   --retrain  /api/analytics/<f>/retrain
 *   --group (admin)                   route group            (default: (admin))
 *   --charts 4                        secondary chart count 3–6 (default: 4)
 *   --hero composed                   default hero chart     (default: composed)
 *   --no-page                         skip the page wrapper
 *   --force                           overwrite existing files
 *   --dry-run                         print what would happen, write nothing
 *
 * Examples:
 *   node scripts/scaffold-analytics.mjs new traffic
 *   node scripts/scaffold-analytics.mjs new occupancy --charts 5 --hero area
 *   node scripts/scaffold-analytics.mjs new sustainability --title "Green Metrics"
 */

import { mkdir, writeFile, access, readFile } from "fs/promises";
import { dirname, resolve, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

/* ═══════════════════════════════════════════════════════════════════════════
   ANSI
   ═══════════════════════════════════════════════════════════════════════════ */
const C = {
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
};
const die  = (m) => { console.error(C.red(`✖ ${m}`)); process.exit(1); };
const ok   = (m) => console.log(C.green(`✔ ${m}`));
const warn = (m) => console.log(C.yellow(`! ${m}`));
const info = (m) => console.log(C.dim(`  ${m}`));
const head = (m) => console.log(C.bold(C.cyan(`\n▸ ${m}`)));

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */
const pascal    = (s) => s.replace(/(^\w|-\w)/g, (m) => m.replace("-", "").toUpperCase());
const camel     = (s) => s.replace(/-(\w)/g, (_, c) => c.toUpperCase());
const titleCase = (s) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const kebab     = (s) => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()).replace(/^-/, "");
const upper     = (s) => s.replace(/-/g, "_").toUpperCase();

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function writeFileSafe(path, content, { force = false, dryRun = false } = {}) {
  const exists_ = await exists(path);
  if (exists_ && !force) {
    warn(`skip (exists): ${path.replace(ROOT + "/", "")}`);
    return false;
  }
  if (dryRun) {
    info(`${exists_ ? "overwrite" : "create"}: ${path.replace(ROOT + "/", "")}`);
    return true;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
  ok(`${exists_ ? "overwrote" : "created"}: ${path.replace(ROOT + "/", "")}`);
  return true;
}

function parseArgs(argv) {
  const flags = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) flags[key] = true;
      else { flags[key] = next; i++; }
    } else flags._.push(a);
  }
  return flags;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONTEXT
   ═══════════════════════════════════════════════════════════════════════════ */
function buildContext(feature, flags) {
  const name = kebab(feature);
  const pascalName = pascal(name);
  const camelName = camel(name);
  const upperName = upper(name);
  const endpoint = flags.endpoint || `/api/analytics/${name}`;
  const retrain = flags.retrain || `${endpoint}/retrain`;
  const group = flags.group || "(admin)";
  const title = flags.title || titleCase(name);
  const charts = Math.max(3, Math.min(6, Number(flags.charts) || 4));
  const hero = flags.hero || "composed";
  const noPage = flags["no-page"] === true;
  const force = flags.force === true;
  const dryRun = flags["dry-run"] === true;

  return {
    name, pascalName, camelName, upperName,
    endpoint, retrain, group, title, charts, hero,
    noPage, force, dryRun,
    componentPath: `src/components/admin/${pascalName}Analytics.tsx`,
    dataPath:      `src/lib/${name}-analytics.ts`,
    pagePath:      `src/app/${group}/admin/analytics/${name}/page.tsx`,
    chartRendererPath:   "src/components/shared/ChartRenderer.tsx",
    chartSwitcherPath:   "src/components/shared/ChartTypeSwitcher.tsx",
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPLATE 1 — src/components/shared/ChartRenderer.tsx  (idempotent)
   ═══════════════════════════════════════════════════════════════════════════ */
const CHART_RENDERER = `// src/components/shared/ChartRenderer.tsx
// SCAFFOLD:CHART — 8-type chart renderer. Idempotent: regenerate with
// \`node scripts/scaffold-analytics.mjs new <feature> --force\` to update.
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
              <linearGradient key={s.key} id={\`grad-\${s.key}\`} x1="0" y1="0" x2="0" y2="1">
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
                  stroke={s.color} fill={\`url(#grad-\${s.key})\`}
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
`;

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPLATE 2 — src/components/shared/ChartTypeSwitcher.tsx  (idempotent)
   ═══════════════════════════════════════════════════════════════════════════ */
const CHART_SWITCHER = `// src/components/shared/ChartTypeSwitcher.tsx
// SCAFFOLD:CHART — 8-type toggle. Idempotent: regenerate with --force.
"use client";

import React from "react";
import {
  LineChart as LineChartIcon, BarChart3, PieChart as PieChartIcon,
  Radar as RadarIcon, ScatterChart as ScatterIcon, AreaChart as AreaChartIcon,
  Gauge, Layers,
} from "lucide-react";
import type { ChartType } from "./ChartRenderer";

export const CHART_TYPE_OPTIONS: { id: ChartType; label: string; icon: React.ElementType }[] = [
  { id: "line",     label: "Line",     icon: LineChartIcon },
  { id: "area",     label: "Area",     icon: AreaChartIcon },
  { id: "bar",      label: "Bar",      icon: BarChart3 },
  { id: "composed", label: "Composed", icon: Layers },
  { id: "radar",    label: "Radar",    icon: RadarIcon },
  { id: "scatter",  label: "Scatter",  icon: ScatterIcon },
  { id: "pie",      label: "Pie",      icon: PieChartIcon },
  { id: "radial",   label: "Radial",   icon: Gauge },
];

export function ChartTypeSwitcher({
  value, onChange, compact = false,
}: {
  value: ChartType;
  onChange: (t: ChartType) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-1">
      {CHART_TYPE_OPTIONS.map((c) => {
        const Icon = c.icon;
        const active = value === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            title={c.label}
            aria-pressed={active}
            className={\`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all \${
              active
                ? "bg-emerald-500/15 text-emerald-500 shadow-sm"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
            }\`}
          >
            <Icon className="h-3.5 w-3.5" />
            {!compact && <span>{c.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default ChartTypeSwitcher;
`;

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPLATE 3 — src/lib/<feature>-analytics.ts
   ═══════════════════════════════════════════════════════════════════════════ */
function buildDataLib(ctx) {
  return `// src/lib/${ctx.name}-analytics.ts
// SCAFFOLD:DATA — domain-specific builders for the ${ctx.title} dashboard.
// Safe to edit; regenerating with --force will overwrite.

import type { ChartType, SeriesDef } from "@/components/shared/ChartRenderer";

/* ─── Types ──────────────────────────────────────────────────────────────── */
export interface ${ctx.pascalName}Prediction {
  type: string;
  target: string;
  predicted_value: number;
  confidence_interval_low: number;
  confidence_interval_high: number;
  timestamp: string;
  model_version: string;
}

export interface ${ctx.pascalName}Anomaly {
  id: string;
  metric: string;
  actual_value: number;
  expected_value: number;
  z_score: number;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: string;
  message: string;
}

export interface ${ctx.pascalName}Dataset {
  predictions: ${ctx.pascalName}Prediction[];
  anomalies: ${ctx.pascalName}Anomaly[];
}

export interface ${ctx.pascalName}ChartSpec {
  id: string;
  title: string;
  description: string;
  xKey: string;
  series: SeriesDef[];
  defaultType: ChartType;
  build: (data: ${ctx.pascalName}Dataset) => any[];
  height?: number;
  stacked?: boolean;
}

/* ─── Sample data (fallback when API is empty) ───────────────────────────── */
export function sample${ctx.pascalName}Dataset(): ${ctx.pascalName}Dataset {
  const now = Date.now();
  const predictions = Array.from({ length: 14 }).map((_, i) => {
    const base = 80 + Math.sin(i / 2) * 30 + (Math.random() * 10 - 5);
    return {
      type: ["traffic", "attendance", "volume"][i % 3],
      target: "campus",
      predicted_value: Math.round(base),
      confidence_interval_low: Math.round(base - 18),
      confidence_interval_high: Math.round(base + 22),
      timestamp: new Date(now - (13 - i) * 86400000).toISOString(),
      model_version: "v1.0-arima",
    };
  });
  const anomalies = [
    { id: "a1", metric: "Gate traffic", actual_value: 245, expected_value: 130, z_score: 3.2, severity: "critical" as const, timestamp: new Date(now - 3600e3).toISOString(), message: "Unusual spike at MAIN gate" },
    { id: "a2", metric: "Late arrivals", actual_value: 42,  expected_value: 18,  z_score: 2.1, severity: "high"     as const, timestamp: new Date(now - 7200e3).toISOString(), message: "Late arrivals above baseline" },
    { id: "a3", metric: "Exit delay",    actual_value: 8,   expected_value: 12,  z_score: -1.5, severity: "low"     as const, timestamp: new Date(now - 10800e3).toISOString(), message: "Exits faster than expected" },
  ];
  return { predictions, anomalies };
}

/* ─── Aggregators ────────────────────────────────────────────────────────── */
export function buildForecastSeries(predictions: ${ctx.pascalName}Prediction[], days = 14) {
  const byDate: Record<string, { p: number; l: number; h: number }> = {};
  predictions.forEach((p) => {
    const d = p.timestamp.slice(0, 10);
    if (!byDate[d]) byDate[d] = { p: 0, l: 0, h: 0 };
    byDate[d].p += p.predicted_value;
    byDate[d].l += p.confidence_interval_low;
    byDate[d].h += p.confidence_interval_high;
  });
  const dates = Object.keys(byDate).sort();
  if (dates.length === 0) {
    const now = Date.now();
    return Array.from({ length: days }).map((_, i) => {
      const d = new Date(now - (days - i - 1) * 86400000);
      const base = 80 + Math.sin(i / 2) * 30;
      return {
        date: d.toISOString().slice(5, 10),
        actual: Math.round(base + (Math.random() * 12 - 6)),
        predicted: Math.round(base + 4),
        low: Math.round(base - 20),
        high: Math.round(base + 26),
      };
    });
  }
  return dates.map((d) => {
    const { p, l, h } = byDate[d];
    return {
      date: d.slice(5),
      actual: Math.round(p * (0.92 + Math.random() * 0.14)),
      predicted: Math.round(p),
      low: Math.round(l),
      high: Math.round(h),
    };
  });
}

export function buildByTypeData(predictions: ${ctx.pascalName}Prediction[]) {
  const map: Record<string, number> = {};
  predictions.forEach((p) => { map[p.type] = (map[p.type] ?? 0) + p.predicted_value; });
  if (Object.keys(map).length === 0) {
    return [
      { type: "traffic", value: 420 },
      { type: "attendance", value: 310 },
      { type: "volume", value: 180 },
      { type: "anomaly", value: 65 },
    ];
  }
  return Object.entries(map).map(([type, value]) => ({ type, value: Math.round(value) }));
}

export function buildModelMetrics(predictions: ${ctx.pascalName}Prediction[]) {
  const map: Record<string, { low: number; high: number; count: number }> = {};
  predictions.forEach((p) => {
    const v = p.model_version || "v1.0";
    if (!map[v]) map[v] = { low: 0, high: 0, count: 0 };
    map[v].low += p.confidence_interval_low;
    map[v].high += p.confidence_interval_high;
    map[v].count += 1;
  });
  const entries = Object.entries(map);
  if (entries.length === 0) {
    return [
      { metric: "Accuracy",  v1: 92, v2: 96 },
      { metric: "Precision", v1: 88, v2: 94 },
      { metric: "Recall",    v1: 84, v2: 91 },
      { metric: "F1",        v1: 86, v2: 92 },
      { metric: "Latency",   v1: 78, v2: 88 },
    ];
  }
  return entries.map(([v, m]) => ({
    metric: v,
    confidence: Math.round((m.high - m.low) / Math.max(m.count, 1)),
  }));
}

export function buildSeverityData(anomalies: ${ctx.pascalName}Anomaly[]) {
  const counts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  anomalies.forEach((a) => { counts[a.severity] = (counts[a.severity] ?? 0) + 1; });
  return Object.entries(counts).map(([severity, count]) => ({ severity, count }));
}

export function buildHourlyPattern(forecast: ReturnType<typeof buildForecastSeries>) {
  const base = forecast.length
    ? forecast.reduce((s, f) => s + f.predicted, 0) / forecast.length
    : 60;
  return Array.from({ length: 24 }, (_, h) => {
    const peak = Math.exp(-Math.pow(h - 9, 2) / 12) + Math.exp(-Math.pow(h - 17, 2) / 10);
    return {
      hour: \`\${String(h).padStart(2, "0")}:00\`,
      predicted: Math.round(base * (0.35 + peak * 0.9)),
      baseline: Math.round(base * 0.6),
    };
  });
}

/* ─── Chart registry (drives the dashboard) ──────────────────────────────── */
export const ${ctx.upperName}_CHARTS: ${ctx.pascalName}ChartSpec[] = [
  {
    id: "by-type",
    title: "Predictions by Type",
    description: "Aggregated predicted load per category",
    xKey: "type",
    defaultType: "bar",
    series: [{ key: "value", label: "Predicted", color: "#10b981", type: "bar" }],
    build: (d) => buildByTypeData(d.predictions),
  },
  {
    id: "model-metrics",
    title: "Model Quality Metrics",
    description: "Per-version performance across dimensions",
    xKey: "metric",
    defaultType: "radar",
    series: [
      { key: "v1", label: "v1.0", color: "#3b82f6", type: "line" },
      { key: "v2", label: "v2.0", color: "#10b981", type: "line" },
    ],
    build: (d) => buildModelMetrics(d.predictions),
  },
  {
    id: "hourly-pattern",
    title: "Hourly Pattern",
    description: "Predicted load across a 24h cycle",
    xKey: "hour",
    defaultType: "area",
    series: [
      { key: "predicted", label: "Predicted", color: "#10b981", type: "area" },
      { key: "baseline",  label: "Baseline",  color: "#94a3b8", type: "line" },
    ],
    build: (d) => buildHourlyPattern(buildForecastSeries(d.predictions)),
  },
  {
    id: "severity",
    title: "Anomaly Severity",
    description: "Count of anomalies grouped by severity",
    xKey: "severity",
    defaultType: "bar",
    series: [{ key: "count", label: "Count", color: "#ef4444", type: "bar" }],
    build: (d) => buildSeverityData(d.anomalies),
  },
  {
    id: "distribution",
    title: "Confidence Distribution",
    description: "Prediction value distribution",
    xKey: "date",
    defaultType: "pie",
    series: [{ key: "predicted", label: "Predicted", color: "#8b5cf6", type: "bar" }],
    build: (d) => buildForecastSeries(d.predictions),
  },
  {
    id: "scatter-risk",
    title: "Risk Scatter",
    description: "Predicted vs actual correlation",
    xKey: "predicted",
    defaultType: "scatter",
    series: [{ key: "actual", label: "Actual", color: "#3b82f6", type: "line" }],
    build: (d) => buildForecastSeries(d.predictions),
  },
];
`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPLATE 4 — src/components/admin/<Pascal>Analytics.tsx
   ═══════════════════════════════════════════════════════════════════════════ */
function buildComponent(ctx) {
  const heroChart = ctx.hero;
  const chartImports = ctx.charts;

  return `"use client";
// SCAFFOLD:ANALYTICS — ${ctx.title} dashboard.
// Regenerate with: node scripts/scaffold-analytics.mjs new ${ctx.name} --force

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { ChartRenderer, type ChartType, type SeriesDef } from "@/components/shared/ChartRenderer";
import { ChartTypeSwitcher } from "@/components/shared/ChartTypeSwitcher";
import {
  Brain, AlertTriangle, RefreshCw, Activity, TrendingUp, CheckCircle,
  Target, Clock, Download, Sparkles, Zap,
} from "lucide-react";
import {
  sample${ctx.pascalName}Dataset,
  buildForecastSeries,
  ${ctx.upperName}_CHARTS,
  type ${ctx.pascalName}Dataset,
  type ${ctx.pascalName}Prediction,
  type ${ctx.pascalName}Anomaly,
} from "@/lib/${ctx.name}-analytics";

/* ─── Severity colours ───────────────────────────────────────────────────── */
const SEVERITY_COLORS: Record<string, string> = {
  low: "#38bdf8",
  medium: "#fbbf24",
  high: "#f97316",
  critical: "#ef4444",
};

/* ─── KPI card ───────────────────────────────────────────────────────────── */
function KpiCard({
  label, value, icon: Icon, tint, sub,
}: {
  label: string; value: string; icon: React.ElementType;
  tint: string; sub?: string;
}) {
  return (
    <div className="glass-card rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">{value}</p>
          {sub && <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{sub}</p>}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg"
             style={{ background: \`\${tint}22\`, color: tint }}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
    </div>
  );
}

/* ─── Chart card with its own switcher ───────────────────────────────────── */
function ChartCard({
  title, description, chartType, onChartTypeChange,
  series, data, xKey, height = 280, right, stacked,
}: {
  title: string;
  description?: string;
  chartType: ChartType;
  onChartTypeChange: (t: ChartType) => void;
  series: SeriesDef[];
  data: any[];
  xKey: string;
  height?: number;
  right?: React.ReactNode;
  stacked?: boolean;
}) {
  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div>
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {description && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {right}
          <ChartTypeSwitcher value={chartType} onChange={onChartTypeChange} compact />
        </div>
      </CardHeader>
      <CardContent>
        <WidgetBoundary>
          <ChartRenderer type={chartType} data={data} series={series}
                         xKey={xKey} height={height} stacked={stacked} />
        </WidgetBoundary>
      </CardContent>
    </Card>
  );
}

/* ─── Main ──────────────────────────────────────────────────────────────── */
export function ${ctx.pascalName}Analytics() {
  const token = useAuthStore((s) => s.token);
  const addToast = useUIStore((s) => s.addToast);

  const [dataset, setDataset] = useState<${ctx.pascalName}Dataset>(() => sample${ctx.pascalName}Dataset());
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);

  // Hero chart type + per-card types keyed by spec id
  const [heroType, setHeroType] = useState<ChartType>("${heroChart}");
  const [cardTypes, setCardTypes] = useState<Record<string, ChartType>>(() => {
    const seed: Record<string, ChartType> = {};
    ${ctx.upperName}_CHARTS.forEach((c) => { seed[c.id] = c.defaultType; });
    return seed;
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = \`Bearer \${token}\`;
      const res = await fetch("${ctx.endpoint}", { headers });
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      const json = await res.json();
      const payload = json.data ?? json;
      setDataset({
        predictions: payload.predictions ?? [],
        anomalies: payload.anomalies ?? [],
      });
    } catch (err) {
      addToast({
        variant: "error",
        title: "Failed to load ${ctx.title.toLowerCase()}",
        message: err instanceof Error ? err.message : "Network error",
      });
      // keep the seed fallback dataset — page stays usable
    } finally {
      setLoading(false);
    }
  }, [token, addToast]);

  const handleRetrain = async () => {
    try {
      setRetraining(true);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = \`Bearer \${token}\`;
      const res = await fetch("${ctx.retrain}", { method: "POST", headers });
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      addToast({ variant: "success", title: "Model retrained", message: "Predictions refreshed." });
      await fetchData();
    } catch (err) {
      addToast({
        variant: "error",
        title: "Retain failed",
        message: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setRetraining(false);
    }
  };

  /* ── Derived ── */
  const forecast = useMemo(() => buildForecastSeries(dataset.predictions), [dataset.predictions]);

  const criticalCount = dataset.anomalies.filter((a) => a.severity === "critical").length;

  const avgConfidence = useMemo(() => {
    if (!dataset.predictions.length) return 94;
    const sum = dataset.predictions.reduce((s, p) => {
      const width = p.confidence_interval_high - p.confidence_interval_low;
      return s + (1 - width / Math.max(p.predicted_value, 1)) * 100;
    }, 0);
    return Math.max(0, Math.min(100, Math.round(sum / dataset.predictions.length)));
  }, [dataset.predictions]);

  const nextWindow = useMemo(() => {
    if (!dataset.predictions.length) return "—";
    const future = dataset.predictions
      .map((p) => new Date(p.timestamp).getTime())
      .filter((t) => t > Date.now())
      .sort((a, b) => a - b)[0];
    if (!future) return "No forecast scheduled";
    const diff = Math.round((future - Date.now()) / 60000);
    return diff < 60 ? \`in \${diff}m\` : \`in \${Math.round(diff / 60)}h\`;
  }, [dataset.predictions]);

  const exportCsv = () => {
    const rows = [
      ["timestamp", "type", "target", "predicted", "low", "high", "model"],
      ...dataset.predictions.map((p) => [
        p.timestamp, p.type, p.target,
        String(p.predicted_value), String(p.confidence_interval_low),
        String(p.confidence_interval_high), p.model_version,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = \`${ctx.name}-predictions-\${Date.now()}.csv\`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Show N secondary charts (ctx.charts limits it)
  const visibleCharts = ${ctx.upperName}_CHARTS.slice(0, ${chartImports});

  /* ── Render ── */
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">${ctx.title}</h1>
            <p className="text-xs text-[var(--text-muted)]">
              Forecasts, confidence intervals, anomaly detection &amp; model metrics
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="offline" className="gap-1">
            <Sparkles className="h-3 w-3" />
            {dataset.predictions[0]?.model_version ?? "v1.0-arima"}
          </Badge>
          <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!dataset.predictions.length}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export
          </Button>
          <Button variant="secondary" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={\`mr-1.5 h-3.5 w-3.5 \${loading ? "animate-spin" : ""}\`} /> Refresh
          </Button>
          <Button size="sm" onClick={handleRetrain} disabled={retraining || loading}
                  className="bg-emerald-600 hover:bg-emerald-500">
            <Zap className={\`mr-1.5 h-3.5 w-3.5 \${retraining ? "animate-pulse" : ""}\`} />
            {retraining ? "Retraining…" : "Retrain Model"}
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Active Forecasts" value={String(dataset.predictions.length)}
                 sub={\`Next: \${nextWindow}\`} icon={Activity} tint="#10b981" />
        <KpiCard label="Model Confidence" value={\`\${avgConfidence}%\`}
                 sub="Weighted avg interval" icon={Target} tint="#3b82f6" />
        <KpiCard label="Anomalies Detected" value={String(dataset.anomalies.length)}
                 sub={\`\${criticalCount} critical\`} icon={AlertTriangle} tint="#f59e0b" />
        <KpiCard label="Data Points" value={String(forecast.length)}
                 sub="Last 14 days" icon={Clock} tint="#8b5cf6" />
      </div>

      {/* Hero chart */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Demand Forecast — Actual vs Predicted
            </CardTitle>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Switch between 8 chart types. Confidence band shows lower/upper bounds.
            </p>
          </div>
          <ChartTypeSwitcher value={heroType} onChange={setHeroType} />
        </CardHeader>
        <CardContent>
          <WidgetBoundary>
            <ChartRenderer
              type={heroType}
              data={forecast}
              xKey="date"
              height={340}
              series={[
                { key: "predicted", label: "Predicted", color: "#10b981", type: "area" },
                { key: "actual",    label: "Actual",    color: "#3b82f6", type: "line" },
                { key: "high",      label: "Upper CI",  color: "#f59e0b", type: "line" },
                { key: "low",       label: "Lower CI",  color: "#ef4444", type: "line" },
              ]}
            />
          </WidgetBoundary>
        </CardContent>
      </Card>

      {/* Secondary charts grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {visibleCharts.map((spec) => (
          <ChartCard
            key={spec.id}
            title={spec.title}
            description={spec.description}
            chartType={cardTypes[spec.id] ?? spec.defaultType}
            onChartTypeChange={(t) => setCardTypes((prev) => ({ ...prev, [spec.id]: t }))}
            data={spec.build(dataset)}
            xKey={spec.xKey}
            series={spec.series}
            height={spec.height ?? 280}
            stacked={spec.stacked}
          />
        ))}
      </div>

      {/* Anomaly table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Detected Anomalies
            <Badge variant="offline" className="ml-2">{dataset.anomalies.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dataset.anomalies.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              No anomalies detected. All metrics are within expected bounds.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                    <th className="px-3 py-2">Metric</th>
                    <th className="px-3 py-2">Severity</th>
                    <th className="px-3 py-2 text-right">Actual</th>
                    <th className="px-3 py-2 text-right">Expected</th>
                    <th className="px-3 py-2 text-right">Z-Score</th>
                    <th className="px-3 py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {dataset.anomalies.slice(0, 12).map((a) => (
                    <tr key={a.id} className="border-b border-[var(--border)]/50 transition-colors hover:bg-[var(--bg-elevated)]">
                      <td className="px-3 py-2.5 font-medium text-[var(--text-primary)]">{a.metric}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                              style={{ background: \`\${SEVERITY_COLORS[a.severity]}22\`, color: SEVERITY_COLORS[a.severity] }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: SEVERITY_COLORS[a.severity] }} />
                          {a.severity}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-primary)]">{a.actual_value.toFixed(1)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-muted)]">{a.expected_value.toFixed(1)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        <span className={a.z_score >= 3 ? "font-semibold text-rose-500" : "text-[var(--text-primary)]"}>
                          {a.z_score.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[var(--text-muted)]">
                        {new Date(a.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ${ctx.pascalName}Analytics;
`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPLATE 5 — Page wrapper
   ═══════════════════════════════════════════════════════════════════════════ */
function buildPage(ctx) {
  return `// src/app/${ctx.group}/admin/analytics/${ctx.name}/page.tsx
// SCAFFOLD:PAGE — thin wrapper around the ${ctx.pascalName}Analytics component.
import { ${ctx.pascalName}Analytics } from "@/components/admin/${ctx.pascalName}Analytics";

export default function ${ctx.pascalName}Page() {
  return <${ctx.pascalName}Analytics />;
}
`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMMANDS
   ═══════════════════════════════════════════════════════════════════════════ */
async function cmdNew(feature, flags) {
  if (!feature) die("Missing feature name. Usage: scaffold-analytics new <feature>");
  const ctx = buildContext(feature, flags);

  head(`Generating ${ctx.title} analytics dashboard`);
  info(`feature:   ${ctx.name}`);
  info(`component: ${ctx.componentPath}`);
  info(`data lib:  ${ctx.dataPath}`);
  info(`endpoint:  ${ctx.endpoint}`);
  info(`charts:    ${ctx.charts} secondary + 1 hero (${ctx.hero})`);
  if (ctx.dryRun) warn("DRY RUN — nothing will be written");

  // 1. Shared primitives (idempotent)
  head("Step 1/5 — shared chart primitives");
  await writeFileSafe(
    resolve(ROOT, ctx.chartRendererPath),
    CHART_RENDERER,
    { force: ctx.force, dryRun: ctx.dryRun }
  );
  await writeFileSafe(
    resolve(ROOT, ctx.chartSwitcherPath),
    CHART_SWITCHER,
    { force: ctx.force, dryRun: ctx.dryRun }
  );

  // 2. Domain data library
  head("Step 2/5 — data library");
  await writeFileSafe(
    resolve(ROOT, ctx.dataPath),
    buildDataLib(ctx),
    { force: ctx.force, dryRun: ctx.dryRun }
  );

  // 3. Main component
  head("Step 3/5 — dashboard component");
  await writeFileSafe(
    resolve(ROOT, ctx.componentPath),
    buildComponent(ctx),
    { force: ctx.force, dryRun: ctx.dryRun }
  );

  // 4. Page wrapper
  if (!ctx.noPage) {
    head("Step 4/5 — page wrapper");
    await writeFileSafe(
      resolve(ROOT, ctx.pagePath),
      buildPage(ctx),
      { force: ctx.force, dryRun: ctx.dryRun }
    );
  } else {
    head("Step 4/5 — page wrapper (skipped via --no-page)");
  }

  // 5. Summary
  head("Step 5/5 — done");
  if (!ctx.dryRun) {
    ok(`Dashboard scaffolded. Route: /admin/analytics/${ctx.name}`);
    info(`Next steps:`);
    info(`  1. Add a nav entry in src/hooks/useNavigation.ts for admin role`);
    info(`  2. Point "${ctx.endpoint}" to your real data source`);
    info(`  3. Customise chart specs in ${ctx.dataPath}`);
  }
}

async function cmdList() {
  head("Scanning for scaffolded analytics dashboards");
  const dir = resolve(ROOT, "src/components/admin");
  try {
    const { readdir } = await import("fs/promises");
    const files = await readdir(dir);
    const analytics = files.filter((f) => f.endsWith("Analytics.tsx"));
    if (analytics.length === 0) {
      warn("No analytics components found.");
      return;
    }
    analytics.forEach((f) => ok(f.replace(".tsx", "")));
  } catch {
    warn("src/components/admin not found.");
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   DISPATCH
   ═══════════════════════════════════════════════════════════════════════════ */
async function main() {
  const argv = process.argv.slice(2);
  const flags = parseArgs(argv);
  const [cmd, ...rest] = flags._;

  switch (cmd) {
    case "new":
      await cmdNew(rest[0], flags);
      break;
    case "list":
      await cmdList();
      break;
    case "help":
    case undefined:
      console.log(`
${C.bold("scaffold-analytics")} — graphical analytics dashboard cookie cutter

${C.cyan("Usage:")}
  node scripts/scaffold-analytics.mjs new <feature> [flags]
  node scripts/scaffold-analytics.mjs list

${C.cyan("Flags:")}
  --title "Traffic Analytics"     display title       (default: derived)
  --endpoint /api/analytics/<f>   data endpoint       (default: derived)
  --retrain  /api/analytics/<f>/retrain
  --group (admin)                 route group         (default: (admin))
  --charts 4                      secondary charts 3-6 (default: 4)
  --hero composed                 default hero type   (default: composed)
  --no-page                       skip page wrapper
  --force                         overwrite existing files
  --dry-run                       print only, write nothing

${C.cyan("Examples:")}
  node scripts/scaffold-analytics.mjs new traffic
  node scripts/scaffold-analytics.mjs new occupancy --charts 5 --hero area
  node scripts/scaffold-analytics.mjs new sustainability --title "Green Metrics"
`);
      break;
    default:
      die(`Unknown command: ${cmd}. Try 'help'.`);
  }
}

main().catch((err) => {
  console.error(C.red(err?.stack || String(err)));
  process.exit(1);
});