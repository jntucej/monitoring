"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { AiVisualType } from "../data/types";

type V = { visual?: { type: AiVisualType; data?: any } };

type Snap = {
  frontier: { id: string; g: number; f: number }[];
  visited: string[];
  current: string | null;
  path: string[];
  done: boolean;
  found: boolean;
  log: string;
  parent: Record<string, string>;
};

const NODES: { id: string; x: number; y: number }[] = [
  { id: "A", x: 50, y: 150 }, { id: "B", x: 145, y: 65 }, { id: "C", x: 145, y: 235 },
  { id: "D", x: 245, y: 65 }, { id: "E", x: 245, y: 235 }, { id: "F", x: 345, y: 150 }, { id: "G", x: 425, y: 200 },
];
const EDGES: [string, string, number][] = [
  ["A","B",2],["A","C",3],["B","D",2],["B","E",4],["C","E",2],["D","F",3],["E","F",3],["F","G",2],["D","G",4],
];
const H: Record<string, number> = { A: 6, B: 4, C: 5, D: 3, E: 4, F: 2, G: 0 };
const ADJ: Record<string, [string, number][]> = (() => {
  const a: Record<string, [string, number][]> = {};
  NODES.forEach((n) => (a[n.id] = []));
  EDGES.forEach(([x, y, w]) => { a[x].push([y, w]); a[y].push([x, w]); });
  return a;
})();

function genSteps(algo: string, start: string, goal: string): Snap[] {
  const snaps: Snap[] = [];
  const fOf = (g: number, id: string) => algo === "UCS" ? g : algo === "Greedy" ? H[id] : algo === "A*" ? g + H[id] : g;
  let frontier: { id: string; g: number; f: number }[] = [{ id: start, g: 0, f: fOf(0, start) }];
  const visited: string[] = [];
  const parent: Record<string, string> = {};
  const snap = (log: string, current: string | null = null, done = false, found = false, path: string[] = []) =>
    snaps.push({ frontier: frontier.map((n) => ({ ...n })), visited: [...visited], current, path, done, found, log, parent: { ...parent } });
  snap(`${algo} start: frontier = [${start}]`);
  let guard = 0;
  while (frontier.length && ++guard < 200) {
    let idx = 0;
    if (algo === "DFS") idx = frontier.length - 1;
    else if (algo !== "BFS") frontier.forEach((n, i) => { if (n.f < frontier[idx].f || (n.f === frontier[idx].f && n.id < frontier[idx].id)) idx = i; });
    const cur = frontier.splice(idx, 1)[0];
    if (visited.includes(cur.id)) { snap(`Skip ${cur.id} - already expanded`, cur.id); continue; }
    visited.push(cur.id);
    const h = H[cur.id];
    if (algo === "A*") snap(`Expand ${cur.id}: g=${cur.g}, h=${h} => f=${cur.g + h} (lowest f)`, cur.id);
    else if (algo === "UCS") snap(`Expand ${cur.id}: g=${cur.g} (lowest path cost)`, cur.id);
    else if (algo === "Greedy") snap(`Expand ${cur.id}: h=${h} (closest to goal)`, cur.id);
    else snap(`Expand ${cur.id}`, cur.id);
    if (cur.id === goal) { const path: string[] = []; let n: string | undefined = goal; while (n) { path.unshift(n); n = parent[n]; } snap(`Goal! Path ${path.join(" -> ")} cost ${cur.g}`, cur.id, true, true, path); return snaps; }
    const nbrs = algo === "DFS" ? [...ADJ[cur.id]].reverse() : ADJ[cur.id];
    for (const [id, w] of nbrs) {
      if (id === cur.id || visited.includes(id)) continue;
      if (!parent[id] && id !== start) parent[id] = cur.id;
      const g = cur.g + w;
      if (!frontier.some((n) => n.id === id)) frontier.push({ id, g, f: fOf(g, id) });
    }
    snap(`Add ${cur.id} neighbours - frontier: ${frontier.map((n) => n.id).join(", ") || "empty"}`, cur.id);
  }
  snap("Frontier empty - no solution", null, true);
  return snaps;
}

function SearchVisual({ data }: { data: any }) {
  const [algo, setAlgo] = useState("BFS");
  const [start, setStart] = useState("A");
  const [goal, setGoal] = useState("G");
  const snaps = useMemo(() => genSteps(algo, start, goal), [algo, start, goal]);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => setI(0), [snaps]);
  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (playing) timer.current = setInterval(() => setI((p) => p >= snaps.length - 1 ? (setPlaying(false), p) : p + 1), 750);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [playing, snaps]);
  const s = snaps[Math.min(i, snaps.length - 1)];
  const ns = (id: string) => s.path.includes(id) ? "path" : s.current === id ? "cur" : s.visited.includes(id) ? "vis" : s.frontier.some((n) => n.id === id) ? "fr" : "idle";
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {["BFS","DFS","UCS","Greedy","A*"].map((a) => (
          <button key={a} onClick={() => setAlgo(a)} className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border ${algo === a ? "bg-[var(--action-primary)] text-white border-transparent" : "bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--action-primary)]/40"}`}>{a}</button>
        ))}
        <span className="ml-auto flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
          <label htmlFor="sv-s">start</label>
          <select id="sv-s" value={start} onChange={(e) => setStart(e.target.value)} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded px-1 py-0.5 text-[10px] text-[var(--text-primary)]">{NODES.map((n) => <option key={n.id}>{n.id}</option>)}</select>
          <label htmlFor="sv-g">goal</label>
          <select id="sv-g" value={goal} onChange={(e) => setGoal(e.target.value)} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded px-1 py-0.5 text-[10px] text-[var(--text-primary)]">{NODES.map((n) => <option key={n.id}>{n.id}</option>)}</select>
        </span>
      </div>
      <svg viewBox="0 0 480 290" className="w-full rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]" role="img" aria-label="Search graph">
        {EDGES.map(([a, b, w]) => {
          const na = NODES.find((n) => n.id === a)!;
          const nb = NODES.find((n) => n.id === b)!;
          const op = s.path.includes(a) && s.path.includes(b) && Math.abs(s.path.indexOf(a) - s.path.indexOf(b)) === 1;
          return (<g key={a + b}><line x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke={op ? "var(--unit-b)" : "var(--border-strong)"} strokeWidth={op ? 3 : 1.5} /><text x={(na.x + nb.x) / 2} y={(na.y + nb.y) / 2 - 4} textAnchor="middle" fontSize="9" className="fill-[var(--text-muted)]">{w}</text></g>);
        })}
        {NODES.map((n) => {
          const st = ns(n.id);
          const onF = s.frontier.find((f) => f.id === n.id);
          return (<g key={n.id}><circle cx={n.x} cy={n.y} r={16} fill={st === "path" ? "var(--unit-b)" : st === "cur" ? "var(--action-primary)" : "var(--bg-surface)"} stroke={st === "fr" ? "var(--unit-a)" : st === "vis" ? "var(--border-strong)" : st === "cur" ? "var(--action-primary)" : "var(--border)"} strokeWidth={st === "cur" ? 2.5 : 1.5} strokeDasharray={st === "fr" ? "3 2" : undefined} /><text x={n.x} y={n.y + 3.5} textAnchor="middle" fontSize="11" fontWeight="700" className="fill-[var(--text-primary)]">{n.id}</text>{onF && (algo === "UCS" || algo === "A*") && <text x={n.x} y={n.y + 30} textAnchor="middle" fontSize="9" className="fill-[var(--text-secondary)]">{algo === "A*" ? `f=${onF.f}` : `g=${onF.g}`}</text>}<text x={n.x - 24} y={n.y - 14} fontSize="8.5" className="fill-[var(--text-muted)]">h={H[n.id]}</text></g>);
        })}
      </svg>
      <SearchFooter s={s} algo={algo} snaps={snaps} setI={setI} playing={playing} setPlaying={setPlaying} i={i} />
      {data?.note && <p className="text-[9.5px] italic text-[var(--text-muted)]">{data.note}</p>}
    </div>
  );
}

function SearchFooter({ s, algo, snaps, setI, playing, setPlaying, i }: any) {
  const curF = s.frontier.length ? Math.min(...s.frontier.map((n: any) => n.f)) : null;
  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <button onClick={() => setI((p: number) => Math.max(0, p - 1))} className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[10.5px] font-semibold text-[var(--text-secondary)]">◀ Prev</button>
        <button onClick={() => setI((p: number) => Math.min(snaps.length - 1, p + 1))} className="px-2.5 py-1 rounded-lg bg-[var(--action-primary)] text-white text-[10.5px] font-bold">Step ▶</button>
        <button onClick={() => setPlaying((p: boolean) => !p)} className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[10.5px] font-semibold text-[var(--text-secondary)]">{playing ? "⏸ Pause" : "▶ Play"}</button>
        <button onClick={() => { setI(0); setPlaying(false); }} className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[10.5px] font-semibold text-[var(--text-secondary)]">⟲ Reset</button>
        <span className="ml-auto text-[9.5px] text-[var(--text-muted)]">step {i + 1}/{snaps.length}</span>
      </div>
      <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] px-2.5 py-2 min-h-[54px] space-y-1">
        <p className="text-[10.5px] text-[var(--text-secondary)]">{s.log}</p>
        <div className="flex flex-wrap gap-1"><span className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Frontier:</span>{s.frontier.length === 0 && <span className="text-[10px] text-[var(--text-muted)]">empty</span>}{s.frontier.map((n: any) => (<span key={n.id} className="px-1.5 py-0.5 rounded border border-dashed border-[var(--unit-a)] text-[9.5px] font-mono text-[var(--text-secondary)]">{n.id}{algo === "UCS" && ` g${n.g}`}{algo === "Greedy" && ` h${n.f}`}{algo === "A*" && ` f${n.f}`}</span>))}</div>
        <div className="flex flex-wrap gap-1 items-center"><span className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Expanded:</span><span className="text-[10px] font-mono text-[var(--text-secondary)]">{s.visited.join(" → ") || "—"}</span></div>
        {algo === "A*" && curF !== null && <p className="text-[9.5px] text-[var(--text-muted)]">Next expansion picks minimum f (currently f={curF}).</p>}
      </div>
    </>
  );
}

export function AiVisual({ visual }: V) {
  if (!visual) return null;
  const d = visual.data ?? {};
  switch (visual.type) {
    case "search": return <SearchVisual data={d} />;
    case "alphabeta": return <AlphaBetaVisual data={d} />;
    case "comparison": return <Comparison data={d} />;
    case "formula-chip": return <FormulaChip data={d} />;
    case "flow": return <Flow data={d} />;
    case "menu": return <Menu data={d} />;
    case "vtable": return <VTable data={d} />;
    case "tableau": return <Tableau data={d} />;
    case "csp": return <CspVisual data={d} />;
    default: return null;
  }
}

/* ---------- Comparison table (headers + rows) ---------- */
function Comparison({ data }: { data: any }) {
  const headers: string[] = data.headers ?? [];
  const rows: string[][] = data.rows ?? [];
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-1.5">
      <div className="rounded-lg border border-[var(--border)] overflow-x-auto">
        <div className="min-w-max">
          <div className="grid bg-[var(--bg-elevated)] text-[10px] font-bold text-[var(--text-muted)] border-b border-[var(--border)]" style={{ gridTemplateColumns: `repeat(${headers.length}, minmax(72px, 1fr))` }}>
            {headers.map((h, i) => <div key={i} className={`p-2 whitespace-nowrap ${i > 0 ? "border-l border-[var(--border)] text-center" : ""}`}>{h}</div>)}
          </div>
          {rows.map((row, i) => (
            <div key={i} className={`grid text-[10.5px] border-b border-[var(--border)] last:border-0 ${i % 2 === 0 ? "bg-[var(--bg-surface)]/40" : ""}`} style={{ gridTemplateColumns: `repeat(${headers.length}, minmax(72px, 1fr))` }}>
              {row.map((cell, j) => <div key={j} className={`p-2 whitespace-nowrap ${j > 0 ? "border-l border-[var(--border)] text-center text-[var(--text-secondary)]" : "font-medium text-[var(--text-primary)]"}`}>{cell}</div>)}
            </div>
          ))}
        </div>
      </div>
      {data?.note && <p className="text-[9.5px] italic text-[var(--text-muted)]">{data.note}</p>}
    </div>
  );
}

/* ---------- Formula highlight blocks ---------- */
function FormulaChip({ data }: { data: any }) {
  const blocks: any[] = data.blocks ?? [];
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-1.5">
      {blocks.map((b, i) => (
        <div key={i} className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] px-2.5 py-1.5">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-[var(--unit-a)]">{b.label}</span>
          <span className="block text-[10.5px] font-mono text-[var(--text-primary)] mt-0.5">{b.value}</span>
        </div>
      ))}
      {data?.note && <p className="text-[9.5px] italic text-[var(--text-muted)] pt-0.5">{data.note}</p>}
    </div>
  );
}

/* ---------- Ordered vertical flow ---------- */
function Flow({ data }: { data: any }) {
  const steps: string[] = data.steps ?? [];
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-1.5">
      {data?.title && <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{data.title}</p>}
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-[var(--unit-a)] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
          <div className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[10.5px] font-medium text-[var(--text-primary)]">{s}</div>
        </div>
      ))}
      {data?.note && <p className="text-[9.5px] italic text-[var(--text-muted)] pt-0.5">{data.note}</p>}
    </div>
  );
}

/* ---------- Chip menu / grid ---------- */
function Menu({ data }: { data: any }) {
  const chips: string[] = data.chips ?? [];
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-1.5">
      {data?.title && <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{data.title}</p>}
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c, i) => (
          <span key={i} className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[10.5px] font-medium text-[var(--text-secondary)]">{c}</span>
        ))}
      </div>
      {data?.note && <p className="text-[9.5px] italic text-[var(--text-muted)] pt-0.5">{data.note}</p>}
    </div>
  );
}

/* ---------- Truth-table style table (vtable) ---------- */
function VTable({ data }: { data: any }) {
  const headers: string[] = data.headers ?? [];
  const rows: string[][] = data.rows ?? [];
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-1.5">
      <div className="rounded-lg border border-[var(--border)] overflow-x-auto">
        <div className="min-w-max">
          <div className="grid text-[10px] font-bold text-[var(--text-muted)] border-b border-[var(--border)]" style={{ gridTemplateColumns: `repeat(${headers.length}, minmax(56px, 1fr))` }}>
            {headers.map((h, i) => <div key={i} className={`p-2 text-center whitespace-nowrap ${i > 0 ? "border-l border-[var(--border)]" : ""}`}>{h}</div>)}
          </div>
          {rows.map((row, i) => (
            <div key={i} className={`grid text-[10.5px] border-b border-[var(--border)] last:border-0 ${i % 2 === 0 ? "bg-[var(--bg-surface)]/40" : ""}`} style={{ gridTemplateColumns: `repeat(${headers.length}, minmax(56px, 1fr))` }}>
              {row.map((cell, j) => <div key={j} className={`p-2 text-center font-mono font-medium ${j > 0 ? "border-l border-[var(--border)]" : ""} ${cell === "T" ? "text-emerald-500" : cell === "F" ? "text-rose-500" : "text-[var(--text-secondary)]"}`}>{cell}</div>)}
            </div>
          ))}
        </div>
      </div>
      {data?.note && <p className="text-[9.5px] italic text-[var(--text-muted)]">{data.note}</p>}
    </div>
  );
}

/* ---------- Tableau (FOL quantifier / unification board) ---------- */
const UNIFY_PAIRS = [
  { a: "Knows(John, x)", b: "Knows(John, Jane)", theta: "{x / Jane}" },
  { a: "Knows(John, x)", b: "Knows(y, Mother(y))", theta: "{x / Mother(John), y / John}" },
  { a: "Knows(John, x)", b: "Knows(John, John)", theta: "{x / John}" },
];

function Tableau({ data }: { data: any }) {
  const mode = data?.mode ?? "quantifiers";
  const [sel, setSel] = useState(0);
  if (mode === "unify") {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Unification Pairs — tap to see the MGU</p>
        <div className="flex flex-wrap gap-1.5">
          {UNIFY_PAIRS.map((p, i) => (
            <button key={i} onClick={() => setSel(i)} className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border ${sel === i ? "bg-[var(--action-primary)] text-white border-transparent" : "bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-secondary)]"}`}>pair {i + 1}</button>
          ))}
        </div>
        <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] px-2.5 py-2 space-y-1">
          <p className="text-[10.5px] font-mono text-[var(--text-primary)]">{UNIFY_PAIRS[sel].a}</p>
          <p className="text-[10.5px] font-mono text-[var(--text-primary)]">{UNIFY_PAIRS[sel].b}</p>
          <p className="text-[10px] font-bold text-[var(--unit-a)]">θ = {UNIFY_PAIRS[sel].theta}</p>
        </div>
        {data?.note && <p className="text-[9.5px] italic text-[var(--text-muted)]">{data.note}</p>}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Quantifier Reduction</p>
      <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] px-2.5 py-2 text-[10.5px] text-[var(--text-secondary)] space-y-1">
        <p>∀x P(x) — true iff P holds for <span className="font-bold text-[var(--text-primary)]">every</span> object in the domain.</p>
        <p>∃x P(x) — true iff P holds for <span className="font-bold text-[var(--text-primary)]">at least one</span> object.</p>
        <p className="text-[9.5px] text-[var(--text-muted)]">¬∀x P ≡ ∃x ¬P &nbsp;·&nbsp; ¬∃x P ≡ ∀x ¬P</p>
      </div>
      {data?.note && <p className="text-[9.5px] italic text-[var(--text-muted)]">{data.note}</p>}
    </div>
  );
}

/* ---------- Alpha-Beta game tree stepper ---------- */
const AB_NODES = [
  { id: "R", type: "MAX", x: 240, y: 30, value: null as number | null, alpha: -Infinity, beta: Infinity },
  { id: "A", type: "MIN", x: 120, y: 110, value: null as number | null, alpha: -Infinity, beta: Infinity },
  { id: "B", type: "MIN", x: 360, y: 110, value: null as number | null, alpha: -Infinity, beta: Infinity },
  { id: "A1", type: "MAX", x: 60, y: 190, value: 3 as number | null, alpha: -Infinity, beta: Infinity },
  { id: "A2", type: "MAX", x: 180, y: 190, value: 5 as number | null, alpha: -Infinity, beta: Infinity },
  { id: "B1", type: "MAX", x: 300, y: 190, value: 6 as number | null, alpha: -Infinity, beta: Infinity },
  { id: "B2", type: "MAX", x: 420, y: 190, value: 9 as number | null, alpha: -Infinity, beta: Infinity },
];
const AB_EDGES: [string, string][] = [["R","A"],["R","B"],["A","A1"],["A","A2"],["B","B1"],["B","B2"]];

function AlphaBetaVisual({ data }: { data: any }) {
  const [step, setStep] = useState(0);
  const steps = useMemo(() => {
    const s: { nodes: typeof AB_NODES; log: string }[] = [];
    const nodes = JSON.parse(JSON.stringify(AB_NODES));
    let log = "Start at root (MAX). α=−∞, β=+∞.";
    const snap = () => s.push({ nodes: JSON.parse(JSON.stringify(nodes)), log });
    snap();
    nodes[3].alpha = 3; nodes[3].beta = 3; log = "A1 (leaf) = 3. Back to A (MIN): β=3."; snap();
    nodes[4].alpha = 5; nodes[4].beta = 5; log = "A2 (leaf) = 5. A (MIN) keeps min(3,5) = 3."; snap();
    nodes[1].value = 3; nodes[1].beta = 3; log = "A's value = 3. Back to R (MAX): α=3."; snap();
    nodes[5].alpha = 6; nodes[5].beta = 6; log = "B1 (leaf) = 6. B (MIN): β=6."; snap();
    nodes[6].alpha = 9; nodes[6].beta = 9; log = "B2 (leaf) = 9. B (MIN) keeps min(6,9) = 6."; snap();
    nodes[2].value = 6; nodes[2].beta = 6; log = "B's value = 6. Back to R (MAX): max(3,6) = 6."; snap();
    nodes[0].value = 6; nodes[0].alpha = 6; log = "Root value = 6. Optimal move: to B. All leaves visited here — with bigger trees branches where α ≥ β would be pruned."; snap();
    return s;
  }, []);
  const s = steps[Math.min(step, steps.length - 1)];
  const fmt = (v: number) => v === -Infinity ? "−∞" : v === Infinity ? "+∞" : String(v);
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <button onClick={() => setStep((p) => Math.max(0, p - 1))} className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[10.5px] font-semibold text-[var(--text-secondary)]">◀ Prev</button>
        <button onClick={() => setStep((p) => Math.min(steps.length - 1, p + 1))} className="px-2.5 py-1 rounded-lg bg-[var(--action-primary)] text-white text-[10.5px] font-bold">Step ▶</button>
        <button onClick={() => setStep(0)} className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[10.5px] font-semibold text-[var(--text-secondary)]">⟲ Reset</button>
        <span className="ml-auto text-[9.5px] text-[var(--text-muted)]">step {step + 1}/{steps.length}</span>
      </div>
      <svg viewBox="0 0 480 245" className="w-full rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]" role="img" aria-label="Alpha-beta game tree">
        {AB_EDGES.map(([a, b]) => {
          const na = AB_NODES.find((n) => n.id === a)!;
          const nb = AB_NODES.find((n) => n.id === b)!;
          return (<g key={a + b}><line x1={na.x} y1={na.y + 12} x2={nb.x} y2={nb.y - 12} stroke="var(--border-strong)" strokeWidth={1.5} /></g>);
        })}
        {s.nodes.map((n: any) => (
          <g key={n.id}>
            <rect x={n.x - 24} y={n.y - 12} width={48} height={26} rx={6} fill={n.type === "MAX" ? "var(--unit-a-soft)" : "var(--unit-b-soft)"} stroke="var(--border-strong)" strokeWidth={1.5} />
            <text x={n.x} y={n.y - 2} textAnchor="middle" fontSize="8.5" fontWeight="700" className="fill-[var(--text-primary)]">{n.type} {n.id}</text>
            <text x={n.x} y={n.y + 10} textAnchor="middle" fontSize="9" className="fill-[var(--text-secondary)]">{n.value !== null ? `v=${n.value}` : `α=${fmt(n.alpha)} β=${fmt(n.beta)}`}</text>
          </g>
        ))}
      </svg>
      <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] px-2.5 py-2 min-h-[38px]">
        <p className="text-[10.5px] text-[var(--text-secondary)]">{s.log}</p>
      </div>
      {data?.note && <p className="text-[9.5px] italic text-[var(--text-muted)]">{data.note}</p>}
    </div>
  );
}

/* ---------- CSP interactive (Australia map colouring) ---------- */
const CSP_VARS = ["WA", "NT", "SA", "Q", "NSW", "V", "T"];
const CSP_EDGES: [string, string][] = [["WA","NT"],["WA","SA"],["NT","SA"],["NT","Q"],["SA","Q"],["SA","NSW"],["SA","V"],["Q","NSW"],["NSW","V"]];
const CSP_ADJ: Record<string, string[]> = (() => {
  const a: Record<string, string[]> = {};
  CSP_VARS.forEach((v) => (a[v] = []));
  CSP_EDGES.forEach(([u, v]) => { a[u].push(v); a[v].push(u); });
  return a;
})();

function CspVisual({ data }: { data: any }) {
  const colors = ["R", "G", "B"];
  const [assignment, setAssignment] = useState<Record<string, string>>({});
  const [log, setLog] = useState("Click a colour chip to assign it to a variable. Adjacent variables must differ.");
  const assign = (v: string, c: string) => {
    const conflict = CSP_ADJ[v].some((nb) => assignment[nb] === c);
    if (conflict) { setLog(`❌ ${v}=${c} conflicts with an already-coloured neighbour (constraint violated).`); return; }
    const next = { ...assignment, [v]: c };
    setAssignment(next);
    const remaining = CSP_VARS.filter((x) => !(x in next));
    setLog(remaining.length === 0 ? "🎉 All 7 variables assigned — a complete, consistent solution!" : `✓ ${v}=${c}. ${Object.keys(next).length}/${CSP_VARS.length} assigned. Remaining: ${remaining.join(", ")}`);
  };
  const reset = () => { setAssignment({}); setLog("Reset. Click a colour chip to assign it to a variable."); };
  const chipBg: Record<string, string> = { R: "#fca5a5", G: "#86efac", B: "#93c5fd" };
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Australia Map Colouring — domains {colors.join("/")}, constraint: adjacent ≠</p>
      <div className="space-y-1.5">
        {CSP_VARS.map((v) => (
          <div key={v} className="flex items-center gap-1.5">
            <span className="w-9 text-[10px] font-bold text-[var(--text-primary)]">{v}</span>
            {colors.map((c) => (
              <button key={c} onClick={() => assign(v, c)} aria-label={`Assign ${v} = ${c}`} className={`w-6 h-6 rounded text-[9px] font-bold border ${assignment[v] === c ? "ring-2 ring-[var(--action-primary)] border-transparent" : "border-[var(--border)]"}`} style={{ background: chipBg[c], opacity: assignment[v] && assignment[v] !== c ? 0.35 : 1 }}>{c}</button>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={reset} className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[10.5px] font-semibold text-[var(--text-secondary)]">⟲ Reset</button>
        <p className="text-[9.5px] text-[var(--text-muted)] flex-1">{log}</p>
      </div>
      {data?.note && <p className="text-[9.5px] italic text-[var(--text-muted)]">{data.note}</p>}
    </div>
  );
}