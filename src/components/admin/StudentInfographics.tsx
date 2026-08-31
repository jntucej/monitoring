import { useEffect, useState, useMemo } from "react";
import { GraduationCap, Users, Home, Building2, ArrowDownLeft, ArrowUpRight, AlertTriangle, Ban, User, UserCircle, Filter, X } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";

type FilterKeys = "department" | "year" | "status" | "gender" | "type";

interface StudentStats {
  total: number; active: number; suspended: number; flagged: number;
  byDepartment: Array<{ code: string; name: string; count: number; color: string }>;
  byType: Array<{ type: string; label: string; count: number; color: string }>;
  byGender: Array<{ gender: string; count: number; color: string }>;
  byYear: Array<{ year: string; count: number; color: string }>;
  onCampusToday: number; todayEntries: number; todayExits: number;
}

interface Filters { department: string; year: string; status: string; gender: string; type: string; }

const FILTER_OPTIONS: Record<FilterKeys, string[]> = {
  department: ["ALL", "CSE", "IT", "ECE", "EEE", "ME"],
  year: ["ALL", "1", "2", "3", "4"],
  status: ["ALL", "ACTIVE", "SUSPENDED"],
  gender: ["ALL", "male", "female"],
  type: ["ALL", "HM", "HF", "DM", "DF"],
};

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
        {options.map((opt) => <option key={opt} value={opt}>{opt === "ALL" ? "All " + label + "s" : opt}</option>)}
      </select>
    </div>
  );
}

function StatPill({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-${color}-500/10 border border-${color}-500/20`}>
      <span className={`text-${color}-400`}>{icon}</span>
      <div><div className={`text-lg font-black text-${color}-400`}>{value}</div>
        <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide">{label}</div></div>
    </div>
  );
}

function BarRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[var(--text-muted)] w-24 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-[var(--text-primary)] w-8 text-right">{count}</span>
    </div>
  );
}

export function StudentInfographics() {
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ department: "ALL", year: "ALL", status: "ALL", gender: "ALL", type: "ALL" });
  const [showFilters, setShowFilters] = useState(false);

  const loadStats = useMemo(() => async (f: Filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => { if (v !== "ALL") params.set(k, v); });
      const res = await fetch(`/api/students/stats?${params.toString()}`, { headers: getAuthHeaders(), cache: "no-store" });
      const j = await res.json();
      if (j.success) setStats(j.data);
    } catch (err) { console.error("Failed to load stats:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStats(filters); }, [filters, loadStats]);
  const setFilter = (key: FilterKeys, value: string) => setFilters(prev => ({ ...prev, [key]: value }));
  const clearAll = () => setFilters({ department: "ALL", year: "ALL", status: "ALL", gender: "ALL", type: "ALL" });
  const activeCount = Object.values(filters).filter(v => v !== "ALL").length;
  const hasFilters = activeCount > 0;

  if (loading && !stats) return (
    <div className="flex justify-center items-center py-12">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!stats) return null;

  const { total, active, suspended, flagged, byDepartment, byType, byGender, byYear, onCampusToday, todayEntries, todayExits } = stats;
  const hostelers = (byType.find((t) => t.type === "HM" || t.type === "HF")?.count) || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${showFilters || hasFilters ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>
          <Filter className="w-4 h-4" /><span className="text-sm font-semibold">Filters</span>
          {hasFilters && <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-[10px] font-bold text-white">{activeCount}</span>}
        </button>
        {hasFilters && (
          <button onClick={clearAll} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all text-sm font-semibold">
            <X className="w-3.5 h-3.5" />Clear All
          </button>
        )}
      </div>

      {showFilters && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <FilterSelect label="Department" value={filters.department} options={FILTER_OPTIONS.department} onChange={(v) => setFilter("department", v)} />
            <FilterSelect label="Year" value={filters.year} options={FILTER_OPTIONS.year} onChange={(v) => setFilter("year", v)} />
            <FilterSelect label="Status" value={filters.status} options={FILTER_OPTIONS.status} onChange={(v) => setFilter("status", v)} />
            <FilterSelect label="Gender" value={filters.gender} options={FILTER_OPTIONS.gender} onChange={(v) => setFilter("gender", v)} />
            <FilterSelect label="Type" value={filters.type} options={FILTER_OPTIONS.type} onChange={(v) => setFilter("type", v)} />
          </div>
          {hasFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(filters).map(([key, value]) => {
                if (value === "ALL") return null;
                return (
                  <button key={key} onClick={() => setFilter(key as FilterKeys, "ALL")}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all">
                    {FILTER_OPTIONS[key as FilterKeys]?.find((o) => o === value) || value}<X className="w-3 h-3" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatPill label="Total Students" value={total} icon={<GraduationCap className="w-4 h-4" />} color="blue" />
          <StatPill label="On Campus" value={onCampusToday} icon={<Building2 className="w-4 h-4" />} color="emerald" />
          <StatPill label="Today In" value={todayEntries} icon={<ArrowDownLeft className="w-4 h-4" />} color="blue" />
          <StatPill label="Today Out" value={todayExits} icon={<ArrowUpRight className="w-4 h-4" />} color="amber" />
          <StatPill label="Active" value={active} icon={<Users className="w-4 h-4" />} color="emerald" />
          <StatPill label="Flagged" value={flagged} icon={<AlertTriangle className="w-4 h-4" />} color="amber" />
          <StatPill label="Suspended" value={suspended} icon={<Ban className="w-4 h-4" />} color="rose" />
          <StatPill label="Hostelers" value={hostelers} icon={<Home className="w-4 h-4" />} color="purple" />
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">By Department</h3>
          <div className="space-y-2">{byDepartment.map((d) => <BarRow key={d.code} label={d.code} count={d.count} total={total} color={d.color} />)}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Student Type</h3>
          <div className="space-y-2">{byType.map((t) => <BarRow key={t.type} label={t.label} count={t.count} total={total} color={t.color} />)}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">By Gender</h3>
          <div className="space-y-2">
            {byGender.map((g) => (
              <div key={g.gender} className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-muted)] w-16 shrink-0">{g.gender}</span>
                <div className="flex-1 h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${g.color}`} style={{ width: `${total > 0 ? Math.round((g.count / total) * 100) : 0}%` }} />
                </div>
                <span className="text-xs font-bold text-[var(--text-primary)] w-8 text-right">{g.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <div className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <User className="w-3 h-3 text-blue-400" /><span className="text-xs text-blue-400 font-bold">{byGender.find((g) => g.gender === "Male")?.count || 0}</span>
            </div>
            <div className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20">
              <UserCircle className="w-3 h-3 text-pink-400" /><span className="text-xs text-pink-400 font-bold">{byGender.find((g) => g.gender === "Female")?.count || 0}</span>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">By Year</h3>
          <div className="space-y-2">{byYear.map((y) => <BarRow key={y.year} label={y.year} count={y.count} total={total} color={y.color} />)}</div>
        </div>
        <div className="lg:col-span-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Department Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {byDepartment.map((d) => {
              const accent = d.color.replace("bg-", "");
              return (
                <div key={d.code} className={`p-3 rounded-xl border border-${accent}-500/20 bg-${accent}-500/5`}>
                  <div className={`text-2xl font-black text-${accent}-400`}>{d.count}</div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">{d.code}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{total > 0 ? Math.round((d.count / total) * 100) : 0}% of students</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


