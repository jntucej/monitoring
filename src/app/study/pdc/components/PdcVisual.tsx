"use client";

import React, { useState } from "react";
import type { PdcVisualType } from "../data/types";

/* ============================================================
   PDC INTERACTIVE VISUALS
   Every diagram uses theme-adaptive CSS variables so
   container/quadrant colours respond to dark / glass / light.
   ============================================================ */

type V = { type: PdcVisualType; data?: any };

/* ---------- Interactive Flynn's taxonomy ---------- */
function Flynn({ data }: { data: any }) {
  const [sel, setSel] = useState<string | null>(null);
  const quads = data?.quadrants ?? [];
  const detail = data?.detail ?? {};
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-2">
      {data?.title && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{data.title}</p>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        {quads.map((q: any) => {
          const active = sel === q.id;
          const colors: Record<string, [string, string]> = {
            sisd: [active ? "bg-[var(--action-info)]" : "bg-[var(--bg-surface)]", "border-[var(--unit-a)]"],
            simd: [active ? "bg-[var(--action-info)]" : "bg-[var(--bg-surface)]", "border-[var(--unit-a)]"],
            misd: [active ? "bg-[var(--action-warning)]" : "bg-[var(--bg-surface)]", "border-[var(--unit-b)]"],
            mimd: [active ? "bg-[var(--action-info)]" : "bg-[var(--bg-surface)]", "border-[var(--unit-c)]"],
          };
          const [bg, bd] = colors[q.id] ?? colors.sisd;
          return (
            <button
              key={q.id}
              onClick={() => setSel(active ? null : q.id)}
              className={`rounded-lg border px-2 py-2 text-left transition-all ${bg} ${bd} ${
                active ? "shadow-md scale-[1.02]" : "hover:border-[var(--action-primary)]/40"
              }`}
            >
              <span className="block font-mono text-[11px] font-bold text-[var(--text-primary)]">{q.label}</span>
              <span className="block text-[9px] text-[var(--text-muted)] mt-0.5 leading-snug">{q.blurb}</span>
            </button>
          );
        })}
      </div>
      <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] px-2.5 py-2 text-[10.5px] text-[var(--text-secondary)] min-h-[38px] flex items-center">
        {sel ? detail[sel] ?? "Select a quadrant." : data?.note ?? "Tap a quadrant to explore it."}
      </div>
    </div>
  );
}
/* ---------- PRM: multiprocessor vs multicomputer ---------- */
function Prm({ data }: { data: any }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-1.5">
      {data?.title && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{data.title}</p>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-lg border border-[var(--unit-a)] bg-[var(--unit-a-soft)] p-2.5">
          <span className="block text-[11px] font-bold text-[var(--unit-a)]">{data.leftTitle}</span>
          <span className="block text-[10px] text-[var(--text-secondary)] mt-1 leading-snug">{data.left}</span>
        </div>
        <div className="rounded-lg border border-[var(--unit-c)] bg-[var(--unit-c-soft)] p-2.5">
          <span className="block text-[11px] font-bold text-[var(--unit-c)]">{data.rightTitle}</span>
          <span className="block text-[10px] text-[var(--text-secondary)] mt-1 leading-snug">{data.right}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Horizontal pipeline ---------- */
function Pipeline({ data }: { data: any }) {
  const stages: string[] = data?.stages ?? [];
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-1.5">
      {data?.title && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{data.title}</p>
      )}
      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-1.5 pt-1">
        {stages.map((s, i) => (
          <React.Fragment key={i}>
            <div className="px-2.5 py-1.5 rounded-lg bg-[var(--unit-a-soft)] border border-[var(--unit-a)] text-[10.5px] font-bold text-[var(--unit-a)] text-center">
              {s}
            </div>
            {i < stages.length - 1 && <span className="text-[10px] text-[var(--text-muted)]">→</span>}
          </React.Fragment>
        ))}
      </div>
      {data?.note && <p className="text-[9.5px] italic text-[var(--text-muted)] pt-0.5">{data.note}</p>}
    </div>
  );
}
/* ---------- Space-time diagram (linear pipeline, interactive) ---------- */
function SpaceTime({ data }: { data: any }) {
  const stages: string[] = data?.stages ?? ["S1", "S2", "S3", "S4"];
  const maxCyc = stages.length + 2;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-2">
      {data?.title && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{data.title}</p>
      )}
      <div className="space-y-0.5">
        <div className="grid" style={{ gridTemplateColumns: `56px repeat(${maxCyc}, minmax(0,1fr))` }}>
          <div />
          {Array.from({ length: maxCyc }, (_, c) => (
            <div key={c} className="text-center text-[9px] font-mono text-[var(--text-muted)]">t{c + 1}</div>
          ))}
        </div>
        {stages.map((s, i) => (
          <div key={s} className="grid items-center" style={{ gridTemplateColumns: `56px repeat(${maxCyc}, minmax(0,1fr))` }}>
            <span className="text-[9px] font-mono font-bold text-[var(--text-muted)]">{s}</span>
            {Array.from({ length: maxCyc }, (_, c) => {
              const busied = c + 1 >= i + 1 && c + 1 <= i + 2;
              return (
                <div
                  key={c}
                  className={`mx-0.5 h-6 rounded border text-center text-[8.5px] font-mono flex items-center justify-center transition-colors ${
                    busied ? "bg-[var(--unit-a-soft)] border-[var(--unit-a)] text-[var(--unit-a)]" : "bg-[var(--bg-surface)]/40 border-[var(--border)] text-transparent"
                  }`}
                >
                  {busied ? `T${i + 1}` : ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="text-[9.5px] italic text-[var(--text-muted)]">{data?.note ?? "Tasks flow one stage per beat down the linear pipe."}</p>
    </div>
  );
}

/* ---------- Reservation table (non-linear pipeline, interactive) ---------- */
function Reservation({ data }: { data: any }) {
  const stages: string[] = data?.stages ?? ["S1", "S2", "S3", "S4"];
  const steps = data?.timeSteps ?? 6;
  const [marks, setMarks] = useState<Record<string, boolean>>({ "0-0": true, "1-1": true, "2-2": true, "3-1": true, "3-4": true });
  const toggle = (r: number, c: number) => setMarks((m) => ({ ...m, [`${r}-${c}`]: !m[`${r}-${c}`] }));
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-2">
      {data?.title && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{data.title}</p>
      )}
      <div className="overflow-x-auto">
        <div className="space-y-0.5 min-w-max">
          <div className="grid items-center" style={{ gridTemplateColumns: `44px repeat(${steps}, minmax(0,34px))` }}>
            <div />
            {Array.from({ length: steps }, (_, c) => (
              <div key={c} className="text-center text-[9px] font-mono text-[var(--text-muted)]">{c + 1}</div>
            ))}
          </div>
          {stages.map((s, r) => (
            <div key={s} className="grid items-center" style={{ gridTemplateColumns: `44px repeat(${steps}, minmax(0,34px))` }}>
              <span className="text-[9px] font-mono font-bold text-[var(--text-muted)]">{s}</span>
              {Array.from({ length: steps }, (_, c) => {
                const on = !!marks[`${r}-${c}`];
                return (
                  <button
                    key={c}
                    onClick={() => toggle(r, c)}
                    className={`mx-0.5 h-6 rounded border text-[9px] font-bold transition-colors ${
                      on ? "bg-[var(--unit-b-soft)] border-[var(--unit-b)] text-[var(--unit-b)]" : "bg-[var(--bg-surface)]/40 border-[var(--border)] text-transparent hover:border-[var(--action-primary)]/40"
                    }`}
                  >
                    {on ? "X" : ""}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {data?.note && <p className="text-[9.5px] italic text-[var(--text-muted)] pt-0.5">{data.note}</p>}
    </div>
  );
}
/* ---------- Consistency models ---------- */
function Consistency({ data }: { data: any }) {
  const [sel, setSel] = useState<string>("sequential");
  const rows = data?.rows ?? {};
  const items = Object.entries(rows);
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-2">
      {data?.note && <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{data.note}</p>}
      <div className="flex flex-wrap gap-1.5">
        {items.map(([key]) => (
          <button
            key={key}
            onClick={() => setSel(key)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors border ${
              sel === key
                ? "bg-[var(--unit-c-soft)] border-[var(--unit-c)] text-[var(--unit-c)]"
                : "bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {key}
          </button>
        ))}
      </div>
      <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] px-2.5 py-2 text-[10.5px] text-[var(--text-secondary)] min-h-[40px]">
        {sel ? rows[sel] : ""}
      </div>
    </div>
  );
}

/* ---------- Comparison table ---------- */
function Comparison({ data }: { data: any }) {
  const rows: any[] = Array.isArray(data?.rows) ? data.rows : [];
  const hasC = rows.some((r) => r.valC !== undefined);
  const cols = hasC ? 3 : 2;
  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="grid bg-[var(--bg-elevated)] text-[10px] font-bold text-[var(--text-muted)] border-b border-[var(--border)]" style={{ gridTemplateColumns: `1fr repeat(${cols}, 1fr)` }}>
        <div className="p-2">Feature</div>
        <div className="p-2 border-l border-[var(--border)] text-center">A</div>
        <div className="p-2 border-l border-[var(--border)] text-center">B</div>
        {hasC && <div className="p-2 border-l border-[var(--border)] text-center">C</div>}
      </div>
      {rows.map((r, i) => (
        <div key={i} className={`grid text-[10.5px] border-b border-[var(--border)] last:border-0 ${i % 2 === 0 ? "bg-[var(--bg-surface)]/40" : ""}`} style={{ gridTemplateColumns: `1fr repeat(${cols}, 1fr)` }}>
          <div className="p-2 font-medium text-[var(--text-primary)]">{r.feature}</div>
          <div className="p-2 text-[var(--text-secondary)] border-l border-[var(--border)] text-center">{r.valA}</div>
          <div className="p-2 text-[var(--text-secondary)] border-l border-[var(--border)] text-center">{r.valB}</div>
          {hasC && <div className="p-2 text-[var(--text-secondary)] border-l border-[var(--border)] text-center">{r.valC}</div>}
        </div>
      ))}
      {data?.note && <p className="text-[9.5px] italic text-[var(--text-muted)] p-2 border-t border-[var(--border)]">{data.note}</p>}
    </div>
  );
}

/* ---------- Interactive menu ---------- */
function Menu({ data }: { data: any }) {
  const [sel, setSel] = useState<number | null>(null);
  const items = data?.items ?? [];
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-2">
      {data?.note && <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{data.note}</p>}
      <div className="flex flex-wrap gap-1.5">
        {items.map((it: any, i: number) => (
          <button
            key={i}
            onClick={() => setSel(sel === i ? null : i)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
              sel === i ? "bg-[var(--unit-a-soft)] border-[var(--unit-a)] text-[var(--unit-a)]" : "bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {it.label}
          </button>
        ))}
      </div>
      {sel !== null && items[sel]?.value && (
        <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] px-2.5 py-2 text-[10.5px] text-[var(--text-secondary)]">{items[sel].value}</div>
      )}
    </div>
  );
}
/* ---------- Interactive Amdahl's law slider ---------- */
function Amdahl({ data }: { data: any }) {
  const [f, setF] = useState(0.1);
  const [p, setP] = useState(16);
  const speedup = 1 / (f + (1 - f) / p);
  const eff = (speedup / p) * 100;
  const pts = Array.from({ length: 8 }, (_, i) => {
    const pp = Math.pow(2, i);
    return { pp, s: 1 / (f + (1 - f) / pp) };
  });
  const maxS = pts[pts.length - 1].s;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-3">
      {data?.title && <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{data.title}</p>}
      <p className="text-center font-mono text-xs text-[var(--unit-a)] font-bold">{data?.formula ?? "S(p) = 1 / (f + (1−f)/p)"}</p>
      <div className="space-y-2">
        <label className="block text-[9.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
          Serial fraction (f) — {Math.round(f * 100)}%
        </label>
        <input type="range" min={0.01} max={0.9} step={0.01} value={f}
          onChange={(e) => setF(parseFloat(e.target.value))}
          className="w-full accent-emerald-500" />
        <label className="block text-[9.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider pt-1">
          Processors (p)
        </label>
        <input type="range" min={2} max={128} step={1} value={p}
          onChange={(e) => setP(parseInt(e.target.value))}
          className="w-full accent-emerald-500" />
      </div>
      <div className="flex items-end gap-1.5 h-24 pt-1">
        {pts.map((pt) => {
          const h = Math.max(4, (pt.s / maxS) * 100);
          return (
            <div key={pt.pp} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full rounded-t bg-[var(--unit-a)]/80" style={{ height: `${h}px` }} title={`p=${pt.pp}, S=${pt.s.toFixed(2)}`} />
              <span className="text-[7.5px] font-mono text-[var(--text-muted)]">{pt.pp}</span>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] px-2.5 py-1.5 text-center">
          <span className="block text-[9px] font-bold uppercase text-[var(--text-muted)]">Speedup</span>
          <span className="block text-lg font-mono font-bold text-[var(--unit-a)]">{speedup.toFixed(2)}×</span>
        </div>
        <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] px-2.5 py-1.5 text-center">
          <span className="block text-[9px] font-bold uppercase text-[var(--text-muted)]">Efficiency</span>
          <span className="block text-lg font-mono font-bold text-[var(--unit-b)]">{eff.toFixed(0)}%</span>
        </div>
      </div>
      <p className="text-[9px] italic text-[var(--text-muted)] text-center">
        Max speedup at p→∞ = 1/f = {(1 / f).toFixed(1)}× — drag f to feel the ceiling collapse.
      </p>
    </div>
  );
}
export function PdcVisual({ visual }: { visual: V }) {
  if (!visual) return null;
  const d = visual.data ?? {};
  switch (visual.type) {
    case "flynn": return <Flynn data={d} />;
    case "prm": return <Prm data={d} />;
    case "pipeline": return <Pipeline data={d} />;
    case "spacetime": return <SpaceTime data={d} />;
    case "reservation": return <Reservation data={d} />;
    case "consistency": return <Consistency data={d} />;
    case "comparison": return <Comparison data={d} />;
    case "menu": return <Menu data={d} />;
    case "amdahl": return <Amdahl data={d} />;
    case "formula-chip": {
      const blocks: any[] = d.blocks ?? [];
      return (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-1.5">
          {blocks.map((b, i) => (
            <div key={i} className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] px-2.5 py-1.5">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-[var(--unit-a)]">{b.label}</span>
              <span className="block text-[10.5px] font-mono text-[var(--text-primary)] mt-0.5">{b.value}</span>
            </div>
          ))}
          {d.note && <p className="text-[9.5px] italic text-[var(--text-muted)] pt-0.5">{d.note}</p>}
        </div>
      );
    }
    case "scale": {
      const labels: string[] = d.labels ?? [];
      return (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-2">
          {labels.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[var(--unit-b)]">■</span>
              <span className="text-[10.5px] font-medium text-[var(--text-secondary)]">{l}</span>
            </div>
          ))}
          {d.note && <p className="text-[9.5px] italic text-[var(--text-muted)]">{d.note}</p>}
        </div>
      );
    }
    case "flow": {
      const steps: string[] = d.steps ?? [];
      return (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-1.5">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[var(--unit-a)] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <div className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[10.5px] font-medium text-[var(--text-primary)]">{s}</div>
            </div>
          ))}
          {d.note && <p className="text-[9.5px] italic text-[var(--text-muted)] pt-0.5">{d.note}</p>}
        </div>
      );
    }
    case "archtree": {
      const branches: any[] = d.branches ?? [];
      return (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-2.5">
          <div className="text-center">
            <span className="px-3 py-1 rounded-lg bg-[var(--action-primary)] text-white text-[11px] font-bold">{d.root}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {branches.map((b, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
                <span className="text-[11px] font-bold text-[var(--unit-a)] block border-b border-[var(--border)] pb-1">{b.name}</span>
                <div className="space-y-0.5 pt-1">
                  {(b.sub || []).map((s: string, j: number) => (
                    <div key={j} className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />{s}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}