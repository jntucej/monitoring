"use client";

import { useEffect, useState } from "react";

export interface CounterBarProps {
  mealType: string;
  counterName: string;
  served: number;
  capacity?: number | null;
}

export function CounterBar({ mealType, counterName, served, capacity }: CounterBarProps) {
  const [clock, setClock] = useState("");

  useEffect(() => {
    const update = () => setClock(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center justify-between bg-black/60 px-4 py-3 text-sm font-medium text-white backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="uppercase tracking-wider text-emerald-400">{mealType}</span>
        <span className="text-white/40">•</span>
        <span>{counterName}</span>
      </div>
      <div className="flex items-center gap-3 tabular-nums">
        <span>
          {served}
          {capacity ? ` / ${capacity}` : ""}
        </span>
        <span className="text-white/40">•</span>
        <span className="font-mono text-white/80">{clock}</span>
      </div>
    </div>
  );
}
