"use client";

/**
 * StudentPicker — a searchable modal to pick a student from a class roster,
 * then hand the selection back to the parent (which routes it into the page's
 * single EntityInspector). Pure presentational: the roster list is passed in
 * (already fetched by the parent), so opening the picker never re-mounts the
 * RoleResponsiveShell and selection never stacks a second overlay.
 */
import { useEffect, useMemo, useState } from "react";
import { Search, X, User } from "lucide-react";

export interface PickerStudent {
  id: string;
  name: string;
  roll: string;
  section?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  students: PickerStudent[];
  onSelect: (s: PickerStudent) => void;
  title?: string;
}

export function StudentPicker({ open, onClose, students, onSelect, title = "Select a student" }: Props) {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  // Esc closes; focus the search input on open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return students;
    return students.filter(
      (s) => s.name.toLowerCase().includes(needle) || s.roll.toLowerCase().includes(needle),
    );
  }, [q, students]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-bg-surface p-4 shadow-xl min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-primary">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or roll…"
            className="surface-card w-full pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-action-primary"
          />
        </div>
        <div className="max-h-72 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-text-muted py-4 text-center">No students found.</p>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left hover:bg-bg-elev-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <User className="w-4 h-4 text-text-muted shrink-0" />
                  <span className="text-sm text-text-primary font-medium truncate">{s.name}</span>
                </span>
                <span className="font-mono text-xs text-text-muted shrink-0">{s.roll}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
