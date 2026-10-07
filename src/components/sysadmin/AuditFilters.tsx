"use client";

import { Download, RefreshCw, Filter } from "lucide-react";

interface AuditFiltersProps {
  actionFilter: string;
  setActionFilter: (val: string) => void;
  userIdFilter: string;
  setUserIdFilter: (val: string) => void;
  fromFilter: string;
  setFromFilter: (val: string) => void;
  toFilter: string;
  setToFilter: (val: string) => void;
  onApply: () => void;
  onReset: () => void;
  onRefresh: () => void;
  onExport: () => void;
  loading: boolean;
  exportDisabled: boolean;
}

export function AuditFilters({
  actionFilter, setActionFilter,
  userIdFilter, setUserIdFilter,
  fromFilter, setFromFilter,
  toFilter, setToFilter,
  onApply, onReset, onRefresh, onExport,
  loading, exportDisabled
}: AuditFiltersProps) {
  return (
    <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border)] space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-sm font-semibold text-white">Filter Audit Trail</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md flex items-center gap-1.5 hover:bg-[var(--bg-base)]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={onExport}
            disabled={exportDisabled}
            className="px-2.5 py-1.5 text-xs bg-[var(--action-primary)] text-white rounded-md flex items-center gap-1.5 font-semibold disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="text-[var(--text-muted)] font-medium mb-1 block">Action</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded px-2.5 py-1.5 focus:outline-none"
          >
            <option value="">All Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="USER_CREATED">USER_CREATED</option>
            <option value="USER_UPDATED">USER_UPDATED</option>
            <option value="ROLE_CHANGED">ROLE_CHANGED</option>
            <option value="BACKUP_CREATED">BACKUP_CREATED</option>
            <option value="BACKUP_RESTORED">BACKUP_RESTORED</option>
          </select>
        </div>

        <div>
          <label className="text-[var(--text-muted)] font-medium mb-1 block">User ID</label>
          <input
            type="text"
            placeholder="Search User ID..."
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded px-2.5 py-1.5 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[var(--text-muted)] font-medium mb-1 block">From Date</label>
          <input
            type="date"
            value={fromFilter}
            onChange={(e) => setFromFilter(e.target.value)}
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded px-2.5 py-1.5 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[var(--text-muted)] font-medium mb-1 block">To Date</label>
          <input
            type="date"
            value={toFilter}
            onChange={(e) => setToFilter(e.target.value)}
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded px-2.5 py-1.5 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
        <button onClick={onReset} className="text-xs text-[var(--text-muted)] hover:text-white underline">
          Reset
        </button>
        <button onClick={onApply} className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold flex items-center gap-1">
          <Filter className="w-3 h-3" /> Apply
        </button>
      </div>
    </div>
  );
}
