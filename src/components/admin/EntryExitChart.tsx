"use client";
import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { getAuthHeaders } from "@/lib/utils";

type Point = { name: string; entries: number; exits: number };

function fmtDay(d: Date): string {
  return d.toLocaleDateString("en-IN", { weekday: "short" });
}

// Lazy-load recharts bundle via next/dynamic with ssr: false
const DynamicRechartsBar = dynamic(
  () =>
    import("recharts").then((mod) => {
      const { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } = mod;
      return function RechartsContent({ data }: { data: Point[] }) {
        return (
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-elevated)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              />
              <Legend iconSize={10} />
              <Bar dataKey="entries" fill="var(--action-primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="exits" fill="var(--action-danger)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      };
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-[80%] flex items-center justify-center text-[var(--text-muted)] text-sm">
        Loading chart…
      </div>
    ),
  }
);

/**
 * Renders the last 7 days of entry/exit activity pulled from /api/gate/logs.
 * Lazy-loaded via next/dynamic (ssr: false) and IntersectionObserver when visible.
 */
export function EntryExitChart() {
  const [data, setData] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver to defer mounting until visible in viewport
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let cancelled = false;
    const load = async () => {
      try {
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() - 6);
        const startStr = start.toISOString().slice(0, 10);
        const endStr = today.toISOString().slice(0, 10);

        const res = await fetch(
          `/api/gate/logs?from=${startStr}&to=${endStr}&limit=1000`,
          { headers: getAuthHeaders(), cache: "no-store" }
        );
        const json = await res.json();

        const buckets: Record<string, { entries: number; exits: number }> = {};
        for (let i = 0; i < 7; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          buckets[d.toISOString().slice(0, 10)] = { entries: 0, exits: 0 };
        }

        const items: any[] = json?.data?.items ?? json?.items ?? [];
        for (const it of items) {
          const day = (it.timestamp ?? "").slice(0, 10);
          if (!buckets[day]) continue;
          if (it.direction === "IN") buckets[day].entries++;
          else if (it.direction === "OUT") buckets[day].exits++;
        }

        const points: Point[] = Object.entries(buckets).map(([day, v]) => ({
          name: fmtDay(new Date(day)),
          entries: v.entries,
          exits: v.exits,
        }));

        if (!cancelled) {
          setData(points);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const t = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      load();
    }, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [isVisible]);

  return (
    <div ref={containerRef} className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 h-96">
      <h3 className="font-semibold mb-4">Weekly Entry/Exit</h3>
      {!isVisible || loading ? (
        <div className="h-[80%] flex items-center justify-center text-[var(--text-muted)] text-sm">
          Loading…
        </div>
      ) : (
        <DynamicRechartsBar data={data} />
      )}
    </div>
  );
}
