"use client";

import Link from "next/link";
import { StudyHeader } from "./layout";
import { ChevronRight, BrainCircuit, Zap, Cpu, Binary, FileCode, Network, Brain } from "lucide-react";

const SUBJECT_CHEATS = [
  {
    href: "/study/ai/cheat",
    title: "🧠 Artificial Intelligence (AI)",
    description: "Interactive cheat sheets for Units I–V. Search, Minimax, CSP, Logic, Planning & Bayes Nets.",
    icon: BrainCircuit,
    color: "#10b981",
  },
  {
    href: "/study/ml/cheat",
    title: "🤖 Machine Learning (ML)",
    description: "Visual cheat sheets for Units I–V. Feature Eng, Regression, Classification, Clustering, ANNs & Deep ML.",
    icon: Brain,
    color: "#3b82f6",
  },
  {
    href: "/study/pdc/cheat",
    title: "⚡ Parallel & Distributed Computing (PDC)",
    description: "Interactive cheat sheets for Units I–V. Amdahl's Law, Flynn's Taxonomy, Pipelining, MPI & Distributed Consensus.",
    icon: Zap,
    color: "#8b5cf6",
  },
  {
    href: "/study/aca/cheat",
    title: "💻 Advanced Computer Architecture (ACA)",
    description: "Cheat sheets for Units I–V. Pipelining, Tomasulo, MESI Cache Coherence, Topologies & GPU CUDA.",
    icon: Cpu,
    color: "#6366f1",
  },
  {
    href: "/study/automata/cheat",
    title: "⚙️ Automata & Formal Languages (TOC/FLAT)",
    description: "Cheat sheets for Units I–V. DFA/NFA, Regular Expressions, CFG/CNF, Turing Machines & Undecidability.",
    icon: Binary,
    color: "#a855f7",
  },
  {
    href: "/study/cd/cheat",
    title: "🛠️ Compiler Design (CD)",
    description: "Cheat sheets for Units I–V. 6 Compiler Phases, FIRST/FOLLOW, LR Parsers, SDT, TAC & DAG Optimization.",
    icon: FileCode,
    color: "#f59e0b",
  },
  {
    href: "/study/dccn/cheat",
    title: "🌐 Data Comm & Computer Networks (DCCN)",
    description: "Cheat sheets for Units I–V. OSI Model, CRC, CSMA/CD, IPv4 Subnetting, TCP/UDP, RSA & TLS.",
    icon: Network,
    color: "#06b6d4",
  },
];

export default function StudyIndexPage() {
  return (
    <>
      <StudyHeader title="Study Portal" />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">CS & Engineering Cheat Sheets Portal 📝</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Dense, visual, interactive revision cards across 7 core Computer Science subjects. Scan formulas, algorithms, worked numericals & exam points in under 30s.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {SUBJECT_CHEATS.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="glass-card rounded-2xl p-5 text-left space-y-3 group cursor-pointer block border border-[var(--border)] hover:border-[var(--action-primary)] transition-all"
            >
              <div
                className="w-10 h-10 rounded-xl border flex items-center justify-center"
                style={{ backgroundColor: `color-mix(in srgb, ${r.color} 12%, transparent)`, borderColor: r.color }}
              >
                <r.icon className="w-5 h-5" style={{ color: r.color }} />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-sm text-[var(--text-primary)]">{r.title}</h2>
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{r.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}

