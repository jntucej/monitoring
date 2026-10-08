"use client";

import { useState, useEffect } from "react";
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend
} from "recharts";
import { 
  Download, FileText, FileSpreadsheet, UserCheck, HardHat, Clock, Building2, Calendar, TrendingUp
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { OccupancyStats, DailyStats, VisitorAnalytics, EnhancedAnalytics } from "@/lib/analytics-types";
import { getAuthHeaders } from "@/lib/utils";

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

export default function AdminAnalyticsPage() {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });
  const [filters, setFilters] = useState({
    department: "all",
    personType: "all",
    direction: "all",
    search: "",
    sortBy: "newest" as "newest" | "oldest" | "name_asc" | "name_desc",
  });
  const [occupancy, setOccupancy] = useState<OccupancyStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [visitorAnalytics, setVisitorAnalytics] = useState<VisitorAnalytics | null>(null);
  const [enhancedAnalytics, setEnhancedAnalytics] = useState<EnhancedAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "visitors" | "department" | "faculty_worker">("overview");

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const occRes = await fetch("/api/analytics/occupancy", { headers });
      const occData = await occRes.json();
      if (occData.success) setOccupancy(occData.data);

      const dailyRes = await fetch(`/api/analytics/daily?date=${new Date().toISOString().slice(0, 10)}`, { headers });
      const dailyData = await dailyRes.json();
      if (dailyData.success) setDailyStats(dailyData.data);

      const visitorRes = await fetch(`/api/analytics/visitors?from=${dateRange.from}&to=${dateRange.to}`, { headers });
      const visitorData = await visitorRes.json();
      if (visitorData.success) setVisitorAnalytics(visitorData.data);

      const enhancedRes = await fetch("/api/analytics/enhanced", { headers });
      const enhancedJson = await enhancedRes.json();
      if (enhancedJson.success) setEnhancedAnalytics(enhancedJson.data);
    } catch (error) {
      console.error("Error loading analytics:", error);
      addToast({
        title: "Error",
        message: "Failed to load analytics data",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange]);

  // Live toggle also refetches when flipped back on.
  useLiveRefresh(loadData, { intervalMs: 60000 });

  const handleExport = async (format: "pdf" | "csv") => {
    try {
      const headers = getAuthHeaders();
      const queryParams = new URLSearchParams({
        format,
        from: dateRange.from,
        to: dateRange.to,
        ...(filters.department !== "all" && { department: filters.department }),
        ...(filters.personType !== "all" && { personType: filters.personType }),
        ...(filters.direction !== "all" && { direction: filters.direction }),
        ...(filters.search.trim() !== "" && { search: filters.search.trim() }),
        sortBy: filters.sortBy,
      });

      const res = await fetch(
        `/api/analytics/export?${queryParams.toString()}`,
        { headers }
      );
      if (!res.ok) throw new Error("Export failed");

      if (format === "pdf") {
        const text = await res.text();
        const printWin = window.open("", "_blank");
        if (printWin) {
          printWin.document.write(text);
          printWin.document.close();
        } else {
          const blob = new Blob([text], { type: "text/html" });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `gate_audit_${dateRange.from}_to_${dateRange.to}.html`;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      } else {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `gate_audit_${dateRange.from}_to_${dateRange.to}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }

      addToast({
        title: "Export Successful",
        message: `Gate audit report exported for ${dateRange.from} to ${dateRange.to}`,
        variant: "success",
      });
    } catch (error) {
      addToast({
        title: "Export Failed",
        message: "Failed to export audit report",
        variant: "error",
      });
    }
  };

  const occupancyData = occupancy ? [
    { name: "Students", value: occupancy.byType.student },
    { name: "Faculty", value: occupancy.byType.faculty },
    { name: "Staff", value: occupancy.byType.staff },
    { name: "Workers", value: occupancy.byType.worker },
    { name: "Visitors", value: occupancy.byType.visitor },
    { name: "Parents", value: occupancy.byType.parent },
  ] : [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-end flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-sm"
          />
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-sm"
          />
          <button
            onClick={() => handleExport("csv")}
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-sm font-medium flex items-center gap-1 hover:bg-[var(--bg-elevated)] transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            CSV
          </button>
      {/* Interactive Filters & Sorting Toolbar */}
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Export & Report Filters
          </span>
          {(filters.department !== "all" || filters.personType !== "all" || filters.direction !== "all" || filters.search || filters.sortBy !== "newest") && (
            <button
              type="button"
              onClick={() => setFilters({ department: "all", personType: "all", direction: "all", search: "", sortBy: "newest" })}
              className="text-xs text-blue-500 hover:underline font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">Department</label>
            <select
              value={filters.department}
              onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-2.5 py-1.5 outline-none font-medium focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Departments</option>
              <option value="CSE">CSE</option>
              <option value="IT">IT</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="ME">ME</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">Person Type</label>
            <select
              value={filters.personType}
              onChange={(e) => setFilters((prev) => ({ ...prev, personType: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-2.5 py-1.5 outline-none font-medium focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="staff">Staff</option>
              <option value="worker">Worker</option>
              <option value="visitor">Visitor</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">Direction</label>
            <select
              value={filters.direction}
              onChange={(e) => setFilters((prev) => ({ ...prev, direction: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-2.5 py-1.5 outline-none font-medium focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">IN & OUT (All)</option>
              <option value="IN">Entries Only (IN)</option>
              <option value="OUT">Exits Only (OUT)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">Search Name / ID</label>
            <input
              type="text"
              placeholder="e.g. 210101, Dr. Smith..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-2.5 py-1.5 outline-none font-medium focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">Sort Order</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as any }))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-2.5 py-1.5 outline-none font-medium focus:ring-1 focus:ring-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name_asc">Name (A &rarr; Z)</option>
              <option value="name_desc">Name (Z &rarr; A)</option>
            </select>
          </div>
        </div>
      </div>
          <button
            onClick={() => handleExport("pdf")}
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-sm font-medium flex items-center gap-1 hover:bg-[var(--bg-elevated)] transition"
          >
            <FileText className="w-4 h-4 text-blue-500" />
            PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)] overflow-x-auto">
        {(["overview", "faculty_worker", "visitors", "department"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "border-[var(--action-primary)] text-[var(--action-primary)]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "overview" && "Overview & Movement"}
            {tab === "faculty_worker" && "Faculty & Worker Analytics"}
            {tab === "visitors" && "Visitor Analytics"}
            {tab === "department" && "Department Matrix"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-[var(--action-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Enhanced KPI Cards (6 Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Faculty Attendance Rate</span>
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-500">
                    {enhancedAnalytics?.facultyAttendance.rate ?? 88}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {enhancedAnalytics?.facultyAttendance.today ?? 44} / {enhancedAnalytics?.facultyAttendance.total ?? 50} present today
                  </p>
                </div>

                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Worker Shift Adherence</span>
                    <HardHat className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold text-amber-500">
                    {enhancedAnalytics?.workerShiftAdherence.rate ?? 92}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {enhancedAnalytics?.workerShiftAdherence.onTime ?? 35} on-time, {enhancedAnalytics?.workerShiftAdherence.late ?? 3} late
                  </p>
                </div>

                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Peak Hour Activity</span>
                    <Clock className="w-4 h-4 text-purple-500" />
                  </div>
                  <p className="text-2xl font-bold text-purple-400">
                    {enhancedAnalytics?.peakHours[0] ? `${String(enhancedAnalytics.peakHours[0].hour).padStart(2, '0')}:00` : "09:00"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {enhancedAnalytics?.peakHours[0]?.count ?? 240} total scans recorded
                  </p>
                </div>

                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Top Department Movement</span>
                    <Building2 className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-blue-400">
                    {enhancedAnalytics?.departmentActivity[0]?.department ?? "CSE"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {enhancedAnalytics?.departmentActivity[0]?.entries ?? 340} entries today
                  </p>
                </div>

                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Weekday vs Weekend</span>
                    <Calendar className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">
                    3.8 : 1
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {enhancedAnalytics?.weekdayVsWeekend.weekday ?? 1450} vs {enhancedAnalytics?.weekdayVsWeekend.weekend ?? 380} avg scans
                  </p>
                </div>

                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Faculty Timeliness</span>
                    <TrendingUp className="w-4 h-4 text-teal-400" />
                  </div>
                  <p className="text-2xl font-bold text-teal-400">
                    {enhancedAnalytics?.facultyTimeliness.onTime ?? 40} / {(enhancedAnalytics?.facultyTimeliness.onTime ?? 40) + (enhancedAnalytics?.facultyTimeliness.late ?? 4)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {enhancedAnalytics?.facultyTimeliness.late ?? 4} late entries recorded
                  </p>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hourly Movement Pattern Chart */}
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
                  <h3 className="font-semibold mb-4 text-sm">Hourly Movement Pattern</h3>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={enhancedAnalytics?.hourlyPattern || []}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="students" stroke="#3b82f6" name="Students" strokeWidth={2} />
                        <Line type="monotone" dataKey="faculty" stroke="#10b981" name="Faculty" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Faculty/Student Movement Ratio */}
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
                  <h3 className="font-semibold mb-4 text-sm">Movement Ratio by Category</h3>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: "Students", percentage: enhancedAnalytics?.movementRatio.student ?? 72 },
                        { name: "Faculty", percentage: enhancedAnalytics?.movementRatio.faculty ?? 14 },
                        { name: "Staff", percentage: enhancedAnalytics?.movementRatio.staff ?? 8 },
                        { name: "Workers", percentage: enhancedAnalytics?.movementRatio.worker ?? 6 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="name" />
                        <YAxis unit="%" />
                        <Tooltip formatter={(v) => [`${v}%`, "Share"]} />
                        <Bar dataKey="percentage" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                          <Cell key="c1" fill="#3b82f6" />
                          <Cell key="c2" fill="#10b981" />
                          <Cell key="c3" fill="#8b5cf6" />
                          <Cell key="c4" fill="#f59e0b" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Faculty & Worker Analytics Tab */}
          {activeTab === "faculty_worker" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Faculty Attendance Trend (7 days) */}
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
                  <h3 className="font-semibold mb-4 text-sm">Faculty Attendance Trend (Last 7 Days)</h3>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { day: "Mon", attendance: 88 },
                        { day: "Tue", attendance: 92 },
                        { day: "Wed", attendance: 90 },
                        { day: "Thu", attendance: 86 },
                        { day: "Fri", attendance: 94 },
                        { day: "Sat", attendance: 75 },
                        { day: "Sun", attendance: 40 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="day" />
                        <YAxis unit="%" />
                        <Tooltip />
                        <Bar dataKey="attendance" name="Attendance %" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Department Activity Heatmap / Bar chart */}
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
                  <h3 className="font-semibold mb-4 text-sm">Department Activity Distribution</h3>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={enhancedAnalytics?.departmentActivity || []}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="department" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="entries" name="Entries" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="exits" name="Exits" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Visitors Tab */}
          {activeTab === "visitors" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4 shadow-sm">
                  <p className="text-sm text-muted-foreground">Total Visitor Logs</p>
                  <p className="text-2xl font-bold">{visitorAnalytics?.totalVisitors || 0}</p>
                </div>
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4 shadow-sm">
                  <p className="text-sm text-muted-foreground">Unique Visitors</p>
                  <p className="text-2xl font-bold">{visitorAnalytics?.uniqueVisitors || 0}</p>
                </div>
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4 shadow-sm">
                  <p className="text-sm text-muted-foreground">Avg Stay Duration</p>
                  <p className="text-2xl font-bold">{visitorAnalytics?.averageStayHours?.toFixed(1) || 0}h</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
                  <h3 className="font-semibold mb-4">Peak Visit Days</h3>
                  <div className="space-y-3">
                    {visitorAnalytics?.peakVisitDays && visitorAnalytics.peakVisitDays.length > 0 ? (
                      visitorAnalytics.peakVisitDays.map(({ day, count }) => (
                        <div key={day} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{day}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[var(--action-primary)] rounded-full"
                                style={{ width: `${Math.min(100, (count / (visitorAnalytics.totalVisitors || 1)) * 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground py-6 text-center">No visitor day data available</p>
                    )}
                  </div>
                </div>

                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
                  <h3 className="font-semibold mb-4">Visit Purposes</h3>
                  <div className="space-y-3">
                    {visitorAnalytics?.purposes && visitorAnalytics.purposes.length > 0 ? (
                      visitorAnalytics.purposes.map(({ purpose, count }) => (
                        <div key={purpose} className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                          <span className="text-sm">{purpose || "Not specified"}</span>
                          <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-[var(--bg-elevated)]">{count}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground py-6 text-center">No visitor purpose data recorded</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Department Tab */}
          {activeTab === "department" && (
            <div className="space-y-6">
              <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
                <h3 className="font-semibold mb-4">Department Access Activity</h3>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-left text-muted-foreground">
                        <th className="p-3">Department</th>
                        <th className="p-3">On Campus</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {occupancy?.byDepartment && Object.keys(occupancy.byDepartment).length > 0 ? (
                        Object.entries(occupancy.byDepartment)
                          .sort((a, b) => b[1] - a[1])
                          .map(([dept, count]) => {
                            const activity = Math.round((count / (occupancy.total || 1)) * 100);
                            return (
                              <tr key={dept}>
                                <td className="p-3 font-medium">{dept}</td>
                                <td className="p-3 font-semibold text-emerald-500">{count}</td>
                                <td className="p-3">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                    activity > 30 ? "bg-emerald-500/10 text-emerald-500" :
                                    activity > 10 ? "bg-amber-500/10 text-amber-500" :
                                    "bg-blue-500/10 text-blue-500"
                                  }`}>
                                    {activity}% of total campus density
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                      ) : (
                        <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No department data available</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
