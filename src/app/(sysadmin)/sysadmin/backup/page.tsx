"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { useUIStore } from "@/stores/uiStore";
import { Database, HardDrive, Download, RefreshCw, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface DiskInfo {
  filesystem: string;
  size: string;
  used: string;
  avail: string;
  usePercent: string;
  mounted: string;
}

interface BackupStats {
  totalBackups: number;
  latestBackup: string | null;
  databaseSize: string;
  diskUsage: DiskInfo[];
}

export default function BackupPage() {
const api = useApi();

  const { addToast } = useUIStore();
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [backupRunning, setBackupRunning] = useState(false);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = api.getHeaders();
      const [statsRes, tablesRes] = await Promise.all([
        fetch("/api/admin/backup", { headers }),
        fetch("/api/admin/tables", { headers }),
      ]);
      
      const statsJson = await statsRes.json();
      const tablesJson = await tablesRes.json();
      
      if (statsJson.success) {
        setStats(statsJson.data);
      }
      
      if (tablesJson.success) {
        setAvailableTables(tablesJson.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch backup data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBackup = async () => {
    setBackupRunning(true);
    try {
      const headers = api.getHeaders();
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "create" }),
      });
      const json = await res.json();
      
      if (json.success) {
        addToast({ variant: "success", title: "Backup Created", message: `Database backup completed successfully` });
        fetchData();
      } else {
        addToast({ variant: "error", title: "Backup Failed", message: json.error?.message || "Unknown error" });
      }
    } catch (error) {
      addToast({ variant: "error", title: "Error", message: "Failed to create backup" });
    } finally {
      setBackupRunning(false);
    }
  };

  const handleExportCSV = async (tableName: string) => {
    setExporting(true);
    try {
      const headers = api.getHeaders();
      const res = await fetch(`/api/admin/export?table=${tableName}&format=csv`, { headers });
      
      if (!res.ok) {
        throw new Error("Export failed");
      }
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tableName}_export.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      addToast({ variant: "success", title: "Export Started", message: `Downloading ${tableName} as CSV` });
    } catch (error) {
      addToast({ variant: "error", title: "Export Failed", message: "Failed to export table" });
    } finally {
      setExporting(false);
    }
  };

  const handleBulkExport = async () => {
    if (selectedTables.length === 0) {
      addToast({ variant: "warning", title: "No Tables Selected", message: "Please select at least one table to export" });
      return;
    }
    
    setExporting(true);
    try {
      const headers = api.getHeaders();
      const res = await fetch("/api/admin/export", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ tables: selectedTables, format: "csv" }),
      });
      
      if (!res.ok) {
        throw new Error("Bulk export failed");
      }
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bulk_export.csv";
      a.click();
      URL.revokeObjectURL(url);
      
      addToast({ variant: "success", title: "Export Started", message: `Exporting ${selectedTables.length} tables as CSV` });
    } catch (error) {
      addToast({ variant: "error", title: "Export Failed", message: "Failed to export selected tables" });
    } finally {
      setExporting(false);
    }
  };

  const toggleTable = (table: string) => {
    setSelectedTables(prev => 
      prev.includes(table) ? prev.filter(t => t !== table) : [...prev, table]
    );
  };

  const getDiskStatus = (usePercent: string) => {
    const num = parseInt(usePercent.replace('%', ''));
    if (num > 90) return { color: "text-red-500", label: "Critical" };
    if (num > 75) return { color: "text-yellow-500", label: "Warning" };
    return { color: "text-green-500", label: "Normal" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--action-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">Backup & Export</p>
          <p className="text-[var(--text-muted)] mt-1">Manage database backups and data exports</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-[var(--bg-base)] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-[var(--text-muted)] text-sm">Database Size</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.databaseSize || "N/A"}</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl">
          <div className="flex items-center gap-3">
            <HardDrive className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-[var(--text-muted)] text-sm">Disk Usage</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">
                {stats?.diskUsage[0]?.usePercent || "N/A"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-[var(--text-muted)] text-sm">Total Backups</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.totalBackups || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Disk Status */}
      <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Disk Status</h2>
        <div className="space-y-2">
          {stats?.diskUsage.map((disk, idx) => {
            const status = getDiskStatus(disk.usePercent);
            return (
              <div key={idx} className="flex items-center justify-between p-3 bg-[var(--bg-base)] rounded-lg">
                <div className="flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-[var(--text-muted)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{disk.mounted}</p>
                    <p className="text-xs text-[var(--text-muted)]">{disk.filesystem}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${status.color}`}>{disk.usePercent} used</p>
                  <p className="text-xs text-[var(--text-muted)]">{disk.used} / {disk.size}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleBackup}
            disabled={backupRunning}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--action-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--action-primary)]/90 disabled:opacity-50 transition-colors"
          >
            {backupRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            Create Full Backup
          </button>
        </div>
      </div>

      {/* CSV Export */}
      <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Table Export (CSV)</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">Select tables to export as CSV files</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {availableTables.map(table => (
            <button
              key={table}
              onClick={() => toggleTable(table)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedTables.includes(table)
                  ? "bg-[var(--action-primary)] text-white"
                  : "bg-[var(--bg-base)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--action-primary)]"
              }`}
            >
              {table}
            </button>
          ))}
        </div>

        <button
          onClick={handleBulkExport}
          disabled={exporting || selectedTables.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export Selected ({selectedTables.length})
        </button>
      </div>

      {/* Latest Backup Info */}
      {stats?.latestBackup && (
        <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Latest Backup</h2>
          <p className="text-sm text-[var(--text-muted)]">{stats.latestBackup}</p>
        </div>
      )}
    </div>
  );
}
