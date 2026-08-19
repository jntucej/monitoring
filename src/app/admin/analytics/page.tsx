"use client";

import { useState, useEffect } from "react";
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from "recharts";
import { 
  Download, RefreshCw, FileText, FileSpreadsheet
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { OccupancyStats, DailyStats, VisitorAnalytics } from "@/lib/analytics-types";

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

export default function AdminAnalyticsPage() {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });
  const [occupancy, setOccupancy] = useState<OccupancyStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [visitorAnalytics, setVisitorAnalytics] = useState<VisitorAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "visitors" | "department">("overview");

  const loadData = async () => {
    setLoading(true);
    try {
      const occRes = await fetch("/api/analytics/occupancy");
      const occData = await occRes.json();
      if (occData.success) setOccupancy(occData.data);

      const dailyRes = await fetch(`/api/analytics/daily?date=${new Date().toISOString().slice(0, 10)}`);
      const dailyData = await dailyRes.json();
      if (dailyData.success) setDailyStats(dailyData.data);

      const visitorRes = await fetch(`/api/analytics/visitors?from=${dateRange.from}&to=${dateRange.to}`);
      const visitorData = await visitorRes.json();
      if (visitorData.success) setVisitorAnalytics(visitorData.data);
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

  const handleExport = async (format: "pdf" | "csv") => {
    try {
      const res = await fetch(`/api/analytics/export?format=${format}&from=${dateRange.from}&to=${dateRange.to}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gate_access_report_${dateRange.from}.${format === "csv" ? "csv" : "html"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      addToast({
        title: "Export Successful",
        message: `Report exported as ${format.toUpperCase()}`,
        variant: "success",
      });
    } catch (error) {
      addToast({
        title: "Export Failed",
        message: "Failed to export report",
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Campus access insights and person-type occupancy trends
          </p>
        </div>
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
            onClick={() => loadData()}
            className="px-3 py-1.5 rounded-lg bg-[var(--action-primary)] text-white text-sm font-medium flex items-center gap-1 hover:opacity-90 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-sm font-medium flex items-center gap-1 hover:bg-[var(--bg-elevated)] transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            CSV
          </button>
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
      <div className="flex gap-1 border-b border-[var(--border)]">
        {(["overview", "visitors", "department"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-[var(--action-primary)] text-[var(--action-primary)]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4 shadow-sm">
                  <p className="text-sm text-muted-foreground">On Campus</p>
                  <p className="text-2xl font-bold">{occupancy?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">All person types</p>
                </div>
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4 shadow-sm">
                  <p className="text-sm text-muted-foreground">Today's Entries</p>
                  <p className="text-2xl font-bold text-emerald-500">{dailyStats?.entries || 0}</p>
                  <p className="text-xs text-muted-foreground">IN scans today</p>
                </div>
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4 shadow-sm">
                  <p className="text-sm text-muted-foreground">Today's Exits</p>
                  <p className="text-2xl font-bold text-rose-500">{dailyStats?.exits || 0}</p>
                  <p className="text-xs text-muted-foreground">OUT scans today</p>
                </div>
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4 shadow-sm">
                  <p className="text-sm text-muted-foreground">Peak Hour</p>
                  <p className="text-2xl font-bold">
                    {dailyStats?.peakHour?.hour 
                      ? `${String(dailyStats.peakHour.hour).padStart(2, "0")}:00` 
                      : "--"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dailyStats?.peakHour?.count || 0} scans
                  </p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Occupancy by Type */}
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
                  <h3 className="font-semibold mb-4">Current Occupancy by Type</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={occupancyData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {occupancyData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Department Breakdown */}
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
                  <h3 className="font-semibold mb-4">Department Occupancy</h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {occupancy?.byDepartment && Object.keys(occupancy.byDepartment).length > 0 ? (
                      Object.entries(occupancy.byDepartment)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10)
                        .map(([dept, count]) => (
                          <div key={dept} className="flex items-center justify-between">
                            <span className="text-sm font-medium">{dept}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-[var(--action-primary)] rounded-full"
                                  style={{ width: `${Math.min(100, (count / (occupancy.total || 1)) * 100)}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{count}</span>
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="text-sm text-muted-foreground py-8 text-center">No department occupancy data available</p>
                    )}
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
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
