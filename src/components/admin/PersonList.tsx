"use client";
import { useEffect, useState } from "react";
import { User, Search } from "lucide-react";
import type { Person, PersonType } from "@/lib/types";
import { PersonBadge } from "@/components/shared/PersonBadge";

export function PersonList() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.append("q", query.trim());
        if (typeFilter !== "all") params.append("type", typeFilter);

        const url = `/api/persons?${params.toString()}`;
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) {
          setPersons(Array.isArray(json.data) ? json.data : []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    setLoading(true);
    const t = setTimeout(load, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, typeFilter]);

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
      <div className="p-4 border-b border-[var(--border)] flex flex-wrap justify-between items-center gap-3">
        <div>
          <h3 className="font-semibold text-white">Campus Directory</h3>
          <p className="text-xs text-[var(--text-muted)]">
            {query || typeFilter !== "all" ? "Filtered results" : `Total Registered: ${persons.length}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)]"
          >
            <option value="all">All Types</option>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="staff">Staff</option>
            <option value="worker">Worker</option>
            <option value="visitor">Visitor</option>
            <option value="parent">Parent</option>
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by ID, name, dept..."
              className="pl-9 pr-4 py-2 w-56 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-[var(--text-muted)] text-sm">Loading...</div>
        ) : persons.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)] text-sm">
            {query || typeFilter !== "all" ? "No matching records found" : "No persons registered"}
          </div>
        ) : (
          persons.slice(0, 40).map((person) => {
            return (
              <div
                key={person.id}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-[var(--border)] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                    <User className="w-5 h-5 text-slate-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{person.fullName || person.name}</p>
                      <PersonBadge type={person.personType} />
                    </div>
                    <p className="text-xs text-[var(--text-muted)] font-mono">{person.uniqueId || person.roll}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[var(--text-secondary)]">{person.department || person.designation || "N/A"}</p>
                  <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                    person.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                  }`}>
                    {person.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export { PersonList as StudentList };
