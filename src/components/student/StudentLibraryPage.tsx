"use client";

import { useEffect, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Loader2, BookOpen, Wallet, Inbox } from "lucide-react";

interface LibraryIssue {
  bookId: string;
  title: string;
  author: string | null;
  issuedAt: string;
  dueAt: string | null;
  returnedAt: string | null;
  fine: number;
  status: string;
}

export function StudentLibraryPage() {
  const [data, setData] = useState<{ totalOutstandingFines: number; issues: LibraryIssue[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/student/library", { credentials: "include" });
        const json = await res.json();
        if (json.success && json.data) setData(json.data);
        else setError(json.error?.message ?? "Failed to load library");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load library");
      }
    })();
  }, []);

  const active = (data?.issues ?? []).filter((i) => i.status === "ISSUED" || !i.returnedAt);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Library</h1>
        <p className="text-sm text-text-muted">Issued books, due dates, and fines.</p>
      </div>

      {error && <div className="surface-card bg-rose-500/10 p-3 text-sm text-action-danger">{error}</div>}
      {data === null && !error && (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading library…
        </div>
      )}

      {data && (
        <>
          <WidgetBoundary name="library-summary" title="Library summary">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="surface-card p-3">
                <div className="flex items-center gap-2 text-text-muted">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-xs uppercase">Books out</span>
                </div>
                <p className="text-2xl font-bold text-text-primary">{active.length}</p>
              </div>
              <div className="surface-card p-3">
                <div className="flex items-center gap-2 text-text-muted">
                  <Wallet className="w-4 h-4" />
                  <span className="text-xs uppercase">Outstanding fines</span>
                </div>
                <p className={`text-2xl font-bold ${data.totalOutstandingFines > 0 ? "text-action-danger" : "text-action-success"}`}>
                  ₹{data.totalOutstandingFines.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </WidgetBoundary>

          <WidgetBoundary name="library-issues" title="Issued books">
            {(data.issues ?? []).length === 0 ? (
              <div className="surface-card p-8 text-center">
                <Inbox className="w-6 h-6 text-text-muted mx-auto mb-2" />
                <p className="text-sm font-medium text-text-primary">No library books currently issued</p>
                <p className="text-xs text-text-muted mt-1">
                  Books you borrow from the Central Library using your Digital ID Card will appear here with their due dates.
                </p>
              </div>
            ) : (
              <div className="surface-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-text-muted text-xs uppercase tracking-wide border-b border-border">
                      <th className="text-left px-3 py-2">Book</th>
                      <th className="text-left px-3 py-2">Issued</th>
                      <th className="text-left px-3 py-2">Due</th>
                      <th className="text-right px-3 py-2">Fine</th>
                      <th className="text-right px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {data.issues.map((i) => (
                      <tr key={i.bookId}>
                        <td className="px-3 py-2 text-text-secondary">
                          {i.title}
                          {i.author ? <span className="text-text-muted"> · {i.author}</span> : null}
                        </td>
                        <td className="px-3 py-2 text-text-muted">
                          {new Date(i.issuedAt).toLocaleDateString()}
                        </td>
                        <td className={`px-3 py-2 text-text-muted ${!i.returnedAt && i.dueAt && new Date(i.dueAt) < new Date() ? "text-action-danger" : ""}`}>
                          {i.dueAt ? new Date(i.dueAt).toLocaleDateString() : "—"}
                        </td>
                        <td className={`px-3 py-2 text-right tabular-nums ${i.fine > 0 ? "text-action-danger" : "text-text-muted"}`}>
                          {i.fine > 0 ? `₹${i.fine}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-bg-elevated text-text-secondary">
                            {i.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </WidgetBoundary>
        </>
      )}
    </div>
  );
}

export default StudentLibraryPage;
