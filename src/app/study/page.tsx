"use client";

import Link from "next/link";
import { StudyHeader } from "./layout";
import { ChevronRight, BrainCircuit, Zap, Cpu, Binary, Network, Brain } from "lucide-react";

const SUBJECT_CHEATS = [
  {
    href: "/study/atcd/cheat",
    title: "⚙️ IT501PC: Automata Theory & Compiler Design (ATCD)",
    description: "Units I–V: DFA/NFA, Regular Expressions, Pumping Lemma, PDA, Turing Machines, Lex & LR Parsers (SLR, LALR, CLR).",
    icon: Binary,
    color: "#a855f7",
    code: "IT501PC",
  },
  {
    href: "/study/dccn/cheat",
    title: "🌐 IT502PC: Data Communications & Computer Networks (DCCN)",
    description: "Units I–V: ISO/OSI model, Framing/CRC, CSMA/CD, IPv4 Subnetting, TCP 3-Way Handshake, DNS, RSA & TLS.",
    icon: Network,
    color: "#06b6d4",
    code: "IT502PC",
  },
  {
    href: "/study/aca/cheat",
    title: "💻 IT511PE: Advanced Computer Architecture (ACA)",
    description: "Units I–V: Parallelism, Amdahl/Gustafson laws, Non-linear Pipelining, MESI/Directory Coherence & GPU CUDA.",
    icon: Cpu,
    color: "#6366f1",
    code: "IT511PE",
  },
  {
    href: "/study/ai/cheat",
    title: "🧠 IT522PE: Artificial Intelligence (AI)",
    description: "Units I–V: Uninformed & Informed Search, Minimax & Alpha-Beta, CSP, Propositional & FOL, Planning & Bayes Nets.",
    icon: BrainCircuit,
    color: "#10b981",
    code: "IT522PE",
  },
  {
    href: "/study/ml/cheat",
    title: "🤖 IT503PC: Machine Learning (ML)",
    description: "Units I–V: Feature Engineering, Linear/Logistic Regression, Naïve Bayes, Decision Trees, ANNs & Deep ML.",
    icon: Brain,
    color: "#3b82f6",
    code: "IT503PC",
  },
  {
    href: "/study/pdc/cheat",
    title: "⚡ Parallel & Distributed Computing (PDC)",
    description: "Units I–V: Amdahl's Law, Flynn's Taxonomy, Pipeline Steppers, Memory Consistency & Distributed Consensus.",
    icon: Zap,
    color: "#8b5cf6",
    code: "PDC",
  },
];

export default function StudyIndexPage() {
  return (
    <>
      <StudyHeader title="Study Portal" />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">CS 3-1 Engineering Cheat Sheets Portal 📝</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Exact syllabus alignment for IT501PC, IT502PC, IT511PE, IT522PE & IT503PC. Dense, visual, interactive revision cards across Units I–V.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {SUBJECT_CHEATS.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="glass-card rounded-2xl p-5 text-left space-y-3 group cursor-pointer block border border-[var(--border)] hover:border-[var(--action-primary)] transition-all"
            >
              <div className="flex items-center justify-between">
                <div
                  className="w-10 h-10 rounded-xl border flex items-center justify-center"
                  style={{ backgroundColor: `color-mix(in srgb, ${r.color} 12%, transparent)`, borderColor: r.color }}
                >
                  <r.icon className="w-5 h-5" style={{ color: r.color }} />
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)]" style={{ color: r.color }}>
                  {r.code}
                </span>
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


