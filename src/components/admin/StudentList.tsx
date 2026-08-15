"use client";
import { User, Search } from "lucide-react";

const DUMMY_STUDENTS = [
  { id: 1, name: "Akarsh Jadi", roll: "2101CS02", branch: "Computer Science" },
  { id: 2, name: "Bhavana", roll: "2101CS08", branch: "Computer Science" },
  { id: 3, name: "Chandu", roll: "2101CS15", branch: "Computer Science" },
  { id: 4, name: "Dhana", roll: "2101CS22", branch: "Computer Science" },
  { id: 5, name: "Eshwar", roll: "2101CS29", branch: "Computer Science" },
  { id: 6, name: "Fathima", roll: "2101ME31", branch: "Mechanical" },
  { id: 7, name: "Ganesh", roll: "2101CE35", branch: "Civil" },
];

export function StudentList() {
  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
      <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
        <h3 className="font-semibold">All Students</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search students..."
            className="pl-10 pr-4 py-2 w-64 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm"
          />
        </div>
      </div>
      <div className="p-4 space-y-2">
        {DUMMY_STUDENTS.map((student) => (
          <div key={student.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/20 text-blue-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">{student.name}</p>
                <p className="text-sm text-[var(--text-muted)]">{student.roll}</p>
              </div>
            </div>
            <p className="text-sm">{student.branch}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
