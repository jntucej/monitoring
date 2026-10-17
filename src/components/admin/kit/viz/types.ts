// Shared types for all infographic components.
// Every viz accepts these primitives so the CLI/generator can scaffold them uniformly.

export type VizStatus = "ok" | "warn" | "error" | "info" | "neutral";
export type VizTone = VizStatus;

export interface VizTheme {
  ok: string;
  warn: string;
  error: string;
  info: string;
  neutral: string;
  text: string;
  muted: string;
  border: string;
  surface: string;
}

// ── FlowMap ────────────────────────────────────────────────
export interface FlowNode {
  id: string;
  label: string;
  status: VizStatus;
  /** 0..1, defaults 0.5 */
  x?: number;
  /** 0..1, defaults 0.5 */
  y?: number;
  meta?: string;
}

export interface FlowEdge {
  from: string;
  to: string;
  /** 0..1 traffic intensity; drives edge pulse speed */
  traffic?: number;
  latencyMs?: number;
  status?: VizStatus;
}

export interface FlowMapProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  height?: number;
  onNodeClick?: (id: string) => void;
  className?: string;
}

// ── HeatStrip ──────────────────────────────────────────────
export interface HeatCell {
  value: number;
  label?: string;
  status?: VizStatus;
  /** ISO timestamp, surfaced as tooltip */
  at?: string;
}

export interface HeatStripProps {
  cells: HeatCell[];
  /** Max cells to render; extras are rolled into the first "…" cell */
  maxCells?: number;
  /** Display height in px */
  height?: number;
  /** Pass-through for aria */
  label: string;
  onCellClick?: (index: number, cell: HeatCell) => void;
  className?: string;
}

// ── HeatMatrix ─────────────────────────────────────────────
export interface HeatMatrixProps {
  rows: string[];
  cols: string[];
  /** value at [rowIndex][colIndex]; negative = missing */
  data: number[][];
  label: string;
  onCellClick?: (row: string, col: string, value: number) => void;
  cellSize?: number;
  className?: string;
}

// ── CalendarHeatmap ─────────────────────────────────────────
export interface CalendarDay {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface CalendarHeatmapProps {
  days: CalendarDay[];
  /** number of weeks to render; defaults to enough to cover `days` */
  weeks?: number;
  label: string;
  onDayClick?: (date: string, value: number) => void;
  className?: string;
}

// ── GeoMap ──────────────────────────────────────────────────
export interface GeoGate {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** radius in meters; rendered as a circle in SVG units */
  radiusMeters?: number;
  status: VizStatus;
}

export interface GeoMapProps {
  gates: GeoGate[];
  /** lat/lng bounds of the map; auto-computed if omitted */
  bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  height?: number;
  onGateClick?: (id: string) => void;
  className?: string;
}

// ── Sankey ──────────────────────────────────────────────────
export interface SankeyNode {
  id: string;
  label: string;
  count: number;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
  status?: VizStatus;
}

export interface SankeyProps {
  source: SankeyNode[];
  target: SankeyNode[];
  links: SankeyLink[];
  height?: number;
  onLinkClick?: (source: string, target: string, value: number) => void;
  className?: string;
}

// ── ChainDots ──────────────────────────────────────────────
export interface ChainStage {
  id: string;
  label: string;
  status: "done" | "active" | "pending";
  /** e.g. "2h", "SLA 6h" */
  meta?: string;
}

export interface ChainDotsProps {
  stages: ChainStage[];
  label: string;
  onStageClick?: (id: string) => void;
  className?: string;
}
