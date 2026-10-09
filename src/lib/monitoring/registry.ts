export interface NamedQuery {
  id: string;
  description: string;
  query: string;
  type: "instant" | "range";
}

// Small by design. Grows only as panels need it — no speculative entries.
export const QUERY_REGISTRY: Record<string, NamedQuery> = {
  "fleet.cpu": {
    id: "fleet.cpu",
    description: "CPU % per container",
    query: 'sum by (name) (rate(container_cpu_usage_seconds_total{name=~"gate_.*|mon_.*"}[5m])) * 100',
    type: "instant",
  },
  "fleet.memory": {
    id: "fleet.memory",
    description: "Working set bytes per container",
    query: 'sum by (name) (container_memory_working_set_bytes{name=~"gate_.*|mon_.*"})',
    type: "instant",
  },
  "fleet.restarts": {
    id: "fleet.restarts",
    description: "Restart count over last 1h",
    query: 'changes(container_start_time_seconds{name=~"gate_.*|mon_.*"}[1h])',
    type: "instant",
  },
  "fleet.up": {
    id: "fleet.up",
    description: "Container liveness (1=up)",
    query: 'count by (name) (container_last_seen{name=~"gate_.*|mon_.*"})',
    type: "instant",
  },
};

export function getNamedQuery(id: string): NamedQuery | null {
  return QUERY_REGISTRY[id] || null;
}
