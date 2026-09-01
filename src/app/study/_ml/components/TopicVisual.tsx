import type { TopicVisual } from "../types";
import { ChevronRight, GitBranch, Layers, Workflow, Scale, Network, LineChart } from "lucide-react";

// Reusable visual renderer for any Topic.visual (spec §8, §36). One component,
// fed structured data, renders tree/flow/layers/pipeline/comparison/dendrogram.

function NodeTree({ root, children }: { root: string; children: string[][] }) {
  return (
    <div className="space-y-2">
      <div className="inline-block rounded-lg px-3 py-1.5 bg-[var(--action-primary)]/10 border border-[var(--action-primary)]/30 text-[11px] font-bold text-[var(--action-primary)]">
        {root}
      </div>
      {children.map((row, gi) => (
        <div key={gi} className="pl-4 border-l-2 border-[var(--border)]/60 ml-2 space-y-1.5">
          {row.map((n) => (
            <div key={n} className="inline-block mr-2 rounded-md px-2.5 py-1 bg-[var(--bg-elevated)] border border-[var(--border)] text-[11px] font-medium text-[var(--text-secondary)]">
              {n}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function NodeFlow({ steps, note }: { steps: string[]; note?: string }) {
  return (
    <div className="space-y-0.5">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-[var(--action-primary)]/15 text-[9px] font-bold text-[var(--action-primary)] flex items-center justify-center flex-shrink-0">
            {i + 1}
          </span>
          <span className="text-[11px] font-medium text-[var(--text-secondary)]">{s}</span>
          {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />}
        </div>
      ))}
      {note && <p className="mt-2 text-[10px] text-[var(--text-muted)] italic">{note}</p>}
    </div>
  );
}

function NodePipeline({ stages }: { stages: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      {stages.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex-1 rounded-md px-3 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] text-[11px] font-medium text-[var(--text-secondary)] min-w-0 truncate">
            {s}
          </div>
          {i < stages.length - 1 && <ChevronRight className="w-3 h-3 text-[var(--action-primary)] flex-shrink-0" />}
        </div>
      ))}
    </div>
  );
}

function NodeComparison({ rows }: { rows: [string, string][] }) {
  return (
    <div className="divide-y divide-[var(--border)]/60 border border-[var(--border)] rounded-lg overflow-hidden">
      {rows.map(([a, b], i) => (
        <div key={i} className={`grid grid-cols-2 gap-2 px-3 py-2 ${i % 2 === 0 ? "bg-[var(--bg-elevated)]/40" : ""}`}>
          <span className="text-[11px] font-semibold text-[var(--text-primary)]">{a}</span>
          <span className="text-[10.5px] text-[var(--text-secondary)]">{b}</span>
        </div>
      ))}
    </div>
  );
}

function NodeDendrogram({ leaves }: { leaves: string[] }) {
  return (
    <div className="flex items-end justify-center gap-3">
      {leaves.map((l) => (
        <div key={l} className="flex flex-col items-center gap-1">
          <div className="w-1 h-6 bg-[var(--action-primary)]/40" />
          <div className="rounded-md px-2 py-1 bg-[var(--bg-elevated)] border border-[var(--border)] text-[10px] font-medium text-[var(--text-secondary)]">{l}</div>
        </div>
      ))}
    </div>
  );
}

export function TopicVisual({ visual }: { visual: TopicVisual }) {
  switch (visual.type) {
    case "tree": return <NodeTree {...visual.data} />;
    case "flow": return <NodeFlow {...visual.data} />;
    case "pipeline": return <NodePipeline {...visual.data} />;
    case "comparison": return <NodeComparison {...visual.data} />;
    case "dendrogram": return <NodeDendrogram {...visual.data} />;
    case "layers": return (
      <div className="space-y-1">
        {(visual.data as { layers: string[] }).layers.map((l, i) => (
          <div key={i} className="rounded-md px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] text-[11px] font-medium text-[var(--text-secondary)] text-center">
            {l}
          </div>
        ))}
      </div>
    );
    case "graph": return (
      <div className="rounded-lg border border-[var(--border)] p-4 text-center">
        <LineChart className="w-8 h-8 mx-auto text-[var(--action-primary)]/50 mb-2" />
        <p className="text-sm font-mono text-[var(--text-primary)]">{visual.data.equation}</p>
      </div>
    );
  }
}