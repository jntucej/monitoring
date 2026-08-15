"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { name: 'Mon', entries: 400, exits: 240 },
  { name: 'Tue', entries: 300, exits: 139 },
  { name: 'Wed', entries: 200, exits: 980 },
  { name: 'Thu', entries: 278, exits: 390 },
  { name: 'Fri', entries: 189, exits: 480 },
  { name: 'Sat', entries: 239, exits: 380 },
  { name: 'Sun', entries: 349, exits: 430 },
];

export function EntryExitChart() {
  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 h-96">
        <h3 className="font-semibold mb-4">Weekly Entry/Exit</h3>
        <ResponsiveContainer width="100%" height="100%">
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
    </div>
  );
}
