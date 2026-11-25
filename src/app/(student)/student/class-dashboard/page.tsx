"use client";

import { useEffect, useState } from "react";

interface LeaderboardRow {
  student_id: string;
  roll_no: string;
  full_name: string;
  attendance_pct: string;
  marks_pct: string;
  achievement_count: number;
}

export default function ClassDashboardPage() {
  const [classId, setClassId] = useState("CSE-5-A");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/class/${encodeURIComponent(classId)}/leaderboard`)
      .then((r) => r.json())
      .then((j) => {
        if (j?.data?.leaderboard) {
          setRows(j.data.leaderboard);
          setError(null);
        } else {
          setError(j?.error?.message ?? "Unable to load class leaderboard");
        }
      })
      .catch(() => setError("Failed to load leaderboard"));
  }, [classId]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Class Dashboard — {classId}</h1>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="border border-border bg-background px-2 py-1 text-sm text-foreground"
          />
          <a
            href={`/api/class/${encodeURIComponent(classId)}/leaderboard.csv`}
            className="border border-border px-3 py-1 text-xs font-semibold text-foreground"
          >
            Download CSV
          </a>
        </div>
      </div>

      {error ? (
        <div className="text-sm text-destructive">{error}</div>
      ) : (
        <div className="divide-y divide-border">
          {rows.map((r, idx) => (
            <div key={r.student_id} className="flex items-center justify-between py-2 text-sm text-foreground">
              <span>
                {idx + 1}. {r.full_name} ({r.roll_no})
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                Att: {r.attendance_pct}% • Marks: {r.marks_pct}% • Awards: {r.achievement_count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
