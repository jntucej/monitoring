"use client";

import { useState, useCallback, useEffect } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { useUIStore } from "@/stores/uiStore";
import { useApi } from "@/hooks/useApi";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {Users, Plus, Search, Link as LinkIcon, Unlink, Check, Copy, KeyRound, X, Loader2, UserCheck}  from "lucide-react";

interface ParentRow {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  uniqueId?: string;
  role?: string;
  children: Array<{
    id: string;
    name: string;
    roll?: string;
    uniqueId?: string;
    department?: string;
  }>;
}

interface StudentOption {
  id: string;
  name: string;
  roll?: string;
  uniqueId?: string;
  department?: string;
  parentUser?: { id: string; name: string } | null;
}

interface CreatedParent {
  id: string;
  name: string;
  email: string;
  plainPassword?: string;
  uniqueId?: string;
}

function EnrollmentCodeModal({ userId, userName, onClose }: { userId: string; userName: string; onClose: () => void }) {
  const api = useApi();
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [codeData, setCodeData] = useState<{ code?: string; expiresAt?: string } | null>(null);

  const generateCode = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/enrollment-code`, {
        method: "POST",
        headers: { ...api.getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "web_bootstrap" }),
      });
      const json = await res.json();
      if (res.ok && json.success !== false) {
        setCodeData(json.data || json);
      } else {
        addToast({ variant: "error", title: "Error", message: json.error?.message || "Failed to generate enrollment code." });
      }
    } catch {
      addToast({ variant: "error", title: "Network error", message: "Could not generate code." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="surface-card bg-bg-elevated w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-unit-c" /> Enrollment Code — {userName}
          </h2>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-text-muted">
          Generate a one-time secure onboarding code for this parent to set their password and sign in directly.
        </p>
        {codeData?.code ? (
          <div className="surface-card p-4 bg-bg-surface text-center space-y-2">
            <span className="text-xs uppercase font-bold text-text-muted block">Secure Code</span>
            <span className="text-2xl font-mono font-black text-action-success tracking-wider">{codeData.code}</span>
            <p className="text-xs text-text-muted">Provide this code to the guardian. Expires in 24 hours.</p>
          </div>
        ) : (
          <button type="button" onClick={generateCode} disabled={loading}
            className="surface-card w-full py-2.5 bg-unit-c hover:bg-unit-c text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
            Generate Onboarding Code
          </button>
        )}
        <div className="flex justify-end pt-2">
          <button type="button" onClick={onClose} className="surface-card px-4 py-2 bg-bg-elevated hover:bg-bg-elevated text-text-secondary text-xs font-semibold">Done</button>
        </div>
      </div>
    </div>
  );
}

export default function SysAdminParentsPage() {
  const api = useApi();
  const { addToast } = useUIStore();

  const [parents, setParents] = useState<ParentRow[]>([]);
  const [unlinkedStudents, setUnlinkedStudents] = useState<StudentOption[]>([]);
  const [_loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", phone: "", studentRoll: "" });
  const [creating, setCreating] = useState(false);
  const [createdResult, setCreatedResult] = useState<CreatedParent | null>(null);
  const [copied, setCopied] = useState(false);

  const [linkTarget, setLinkTarget] = useState<{ student: StudentOption } | null>(null);
  const [linkParentId, setLinkParentId] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);

  const [enrollmentUser, setEnrollmentUser] = useState<{ id: string; name: string } | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<{ parent: ParentRow; child: ParentRow["children"][0] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        fetch("/api/parents", { headers: api.getHeaders(), cache: "no-store" }),
        fetch("/api/students", { headers: api.getHeaders(), cache: "no-store" }),
      ]);
      const pJson = await pRes.json();
      const sJson = await sRes.json();
      if (pRes.ok && pJson.success) setParents(pJson.data || []);
      if (sRes.ok && sJson.success) {
        const students: StudentOption[] = Array.isArray(sJson.data) ? sJson.data : [];
        setUnlinkedStudents(students);
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Failed to load parent telemetry." });
    } finally {
      setLoading(false);
    }
  }, [addToast, api]);

  useEffect(() => { load(); }, [load]);

  const createParent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/parents", {
        method: "POST",
        headers: { ...api.getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();
      if (res.ok && json.success !== false) {
        const created: CreatedParent = json.data || json;
        setCreatedResult(created);
        addToast({ variant: "success", title: "Created", message: "Guardian account registered successfully." });
        setCreateForm({ name: "", email: "", phone: "", studentRoll: "" });
        load();
      } else {
        addToast({ variant: "error", title: "Error", message: json.error?.message || "Failed to create guardian." });
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Failed to create guardian." });
    } finally {
      setCreating(false);
    }
  };

  const handleLink = async () => {
    if (!linkTarget || !linkParentId) return;
    setLinkBusy(true);
    try {
      const res = await fetch("/api/parents/link", {
        method: "POST",
        headers: { ...api.getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: linkTarget.student.id, parentUserId: linkParentId }),
      });
      const json = await res.json();
      if (res.ok && json.success !== false) {
        addToast({ variant: "success", title: "Linked", message: `Successfully linked ${linkTarget.student.name} to guardian.` });
        setLinkTarget(null);
        setLinkParentId("");
        load();
      } else {
        addToast({ variant: "error", title: "Error", message: json.error?.message || "Failed to link guardian." });
      }
    } catch {
      addToast({ variant: "error", title: "Network error", message: "Could not link guardian." });
    } finally {
      setLinkBusy(false);
    }
  };

  const handleUnlink = (parent: ParentRow, child: ParentRow["children"][0]) => {
    setUnlinkTarget({ parent, child });
  };

  const confirmUnlink = async () => {
    if (!unlinkTarget) return;
    const { parent, child } = unlinkTarget;
    try {
      const res = await fetch("/api/parents/link", {
        method: "POST",
        headers: { ...api.getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: child.id, parentUserId: null }),
      });
      const json = await res.json().catch(() => ({ success: false }));
      if (res.ok && json.success) {
        addToast({ variant: "success", title: "Unlinked", message: `${child.name} unlinked from ${parent.name}.` });
        load();
      } else {
        addToast({ variant: "error", title: "Error", message: json.error?.message || "Failed to unlink." });
      }
    } catch {
      addToast({ variant: "error", title: "Network error", message: "Could not unlink." });
    } finally {
      setUnlinkTarget(null);
    }
  };

  const copyPassword = async (pw: string) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(pw);
      else {
        const ta = document.createElement("textarea");
        ta.value = pw;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // password is shown on-screen regardless
    }
  };

  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Users className="size-5 text-unit-c" />
              Parents &amp; Guardians Registry
            </p>
            <p className="text-sm text-text-muted mt-1">Manage guardian accounts, student-parent relationships, and portal access credentials.</p>
          </div>
          <button type="button" onClick={() => { setShowCreate(true); setCreatedResult(null); }}
            className="surface-card flex items-center gap-2 px-4 py-2.5 bg-unit-c text-white text-sm font-semibold hover:bg-unit-c self-start">
            <Plus className="w-4 h-4" /> Register New Parent
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guardians by name, email, phone or student roll…"
            className="surface-card w-full pl-10 pr-4 py-2.5 bg-bg-elevated text-sm text-white placeholder:text-text-muted focus:outline-none focus:"
          />
        </div>

        {/* Parents grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parents
            .filter((p) => {
              if (!query.trim()) return true;
              const q = query.toLowerCase();
              return (
                p.name?.toLowerCase().includes(q) ||
                p.email?.toLowerCase().includes(q) ||
                p.phone?.toLowerCase().includes(q) ||
                p.children?.some((c) => c.name?.toLowerCase().includes(q) || c.roll?.toLowerCase().includes(q))
              );
            })
            .map((p) => (
              <div key={p.id} className="surface-card bg-bg-elevated p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-unit-c" /> {p.name}
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">{p.email || "No email"} · {p.phone || "No phone"}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button type="button" onClick={() => setEnrollmentUser({ id: p.id, name: p.name })}
                      className="surface-card px-2.5 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 text-unit-c text-xs font-semibold flex items-center gap-1" title="Generate enrollment code">
                      <KeyRound className="w-3.5 h-3.5" /> Code
                    </button>
                  </div>
                </div>

                {/* Linked children */}
                <div className="surface-card space-y-2 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Linked Students</span>
                  {p.children && p.children.length > 0 ? (
                    <div className="space-y-1.5">
                      {p.children.map((c) => (
                        <div key={c.id} className="surface-card flex items-center justify-between gap-2 px-3 py-2 bg-bg-surface text-xs">
                          <div>
                            <span className="font-semibold text-white">{c.name}</span>
                            <span className="font-mono text-unit-c ml-2">{c.roll || c.uniqueId}</span>
                            <span className="text-text-muted ml-2">({c.department || "General"})</span>
                          </div>
                          <button type="button" onClick={() => handleUnlink(p, c)}
                            className="text-text-muted hover:text-action-danger p-1" title="Unlink student">
                            <Unlink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted italic">No students linked to this guardian yet.</p>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* Unlinked students section */}
        <div className="surface-card bg-bg-elevated p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-action-success" /> Students Awaiting Guardian Link
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-text-muted uppercase border-b border-border">
                  <th className="pb-2.5 px-3">Student</th>
                  <th className="pb-2.5 px-3">Roll / ID</th>
                  <th className="pb-2.5 px-3">Department</th>
                  <th className="pb-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {unlinkedStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-bg-surface/40">
                    <td className="py-2.5 px-3 font-semibold text-white">{s.name}</td>
                    <td className="py-2.5 px-3 font-mono text-text-secondary">{s.roll || s.uniqueId}</td>
                    <td className="py-2.5 px-3 text-text-muted">{s.department || "—"}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button type="button" onClick={() => setLinkTarget({ student: s })}
                        className="surface-card px-2.5 py-1 bg-action-success hover:bg-action-success text-white font-bold">
                        Link Guardian
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <form onSubmit={createParent} className="surface-card bg-bg-elevated w-full max-w-md p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-unit-c" /> Register Parent / Guardian
                </h2>
                <button type="button" onClick={() => setShowCreate(false)} className="text-text-muted hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              {createdResult ? (
                <div className="space-y-4 py-2">
                  <div className="surface-card p-4 bg-emerald-500/10 text-action-success text-xs space-y-1">
                    <p className="font-bold">Guardian Account Created Successfully!</p>
                    <p>Name: {createdResult.name}</p>
                    <p>Email: {createdResult.email}</p>
                    {createdResult.plainPassword && (
                      <div className="surface-card mt-2 pt-2 flex items-center justify-between">
                        <span className="surface-card font-mono bg-black/30 px-2 py-1 text-white">{createdResult.plainPassword}</span>
                        <button type="button" onClick={() => copyPassword(createdResult.plainPassword!)}
                          className="surface-card px-2.5 py-1 bg-action-success text-white font-bold text-xs flex items-center gap-1">
                          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? "Copied" : "Copy Password"}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="button" onClick={() => { setShowCreate(false); setCreatedResult(null); }}
                      className="surface-card px-4 py-2 bg-unit-c text-white text-xs font-bold">Done</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-text-muted block mb-1">Full Name *</label>
                      <input required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                        placeholder="e.g. Rajesh Sharma" className="surface-card w-full px-3 py-2 bg-bg-surface text-white focus:outline-none focus:" />
                    </div>
                    <div>
                      <label className="text-text-muted block mb-1">Email (portal login) *</label>
                      <input type="email" required value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                        placeholder="e.g. rajesh@example.com" className="surface-card w-full px-3 py-2 bg-bg-surface text-white focus:outline-none focus:" />
                    </div>
                    <div>
                      <label className="text-text-muted block mb-1">Phone Number</label>
                      <input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                        placeholder="e.g. +91 9876543210" className="surface-card w-full px-3 py-2 bg-bg-surface text-white focus:outline-none focus:" />
                    </div>
                    <div>
                      <label className="text-text-muted block mb-1">Student Roll Number (optional auto-link)</label>
                      <input value={createForm.studentRoll} onChange={(e) => setCreateForm({ ...createForm, studentRoll: e.target.value })}
                        placeholder="e.g. 24JJ1A0501" className="surface-card w-full px-3 py-2 bg-bg-surface text-white font-mono focus:outline-none focus:" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowCreate(false)} className="surface-card px-4 py-2 hover:bg-bg-elevated text-text-secondary text-xs font-semibold">Cancel</button>
                    <button type="submit" disabled={creating} className="surface-card px-4 py-2 bg-unit-c hover:bg-unit-c text-white text-xs font-bold disabled:opacity-50">
                      {creating ? "Creating..." : "Register Guardian"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        )}

        {/* Link guardian modal */}
        {linkTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-bg-elevated border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="surface-card p-5 flex items-center justify-between">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-action-success" /> Link Guardian to Student
                </h3>
                <button type="button" onClick={() => setLinkTarget(null)} className="surface-card p-1 hover:bg-bg-elevated text-text-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-text-muted">
                  Linking <strong className="text-white">{linkTarget.student.name}</strong> ({linkTarget.student.roll}) to a
                  guardian. If no suitable guardian exists, create one from the New Parent button.
                </p>

                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1" htmlFor="guardian">Guardian</label>
                  <select id="guardian"
                    value={linkParentId}
                    onChange={(e) => setLinkParentId(e.target.value)}
                    className="surface-card w-full px-3 py-2 bg-bg-surface text-sm text-white focus:outline-none focus:"
                  >
                    <option value="">Select guardian…</option>
                    {parents.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.uniqueId ? `(${p.uniqueId})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setLinkTarget(null)}
                    className="surface-card px-4 py-2 bg-bg-elevated text-text-secondary text-xs font-semibold hover:bg-bg-elevated"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleLink}
                    disabled={linkBusy || !linkParentId}
                    className="surface-card px-4 py-2 bg-unit-c text-white text-xs font-semibold hover:bg-unit-c disabled:opacity-50 flex items-center gap-2"
                  >
                    {linkBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
                    Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enrollment code modal */}
        {enrollmentUser && (
          <EnrollmentCodeModal
            userId={enrollmentUser.id}
            userName={enrollmentUser.name}
            onClose={() => setEnrollmentUser(null)}
          />
        )}

        <ConfirmDialog
          open={!!unlinkTarget}
          onClose={() => setUnlinkTarget(null)}
          title="Unlink student?"
          body={unlinkTarget ? `Unlink ${unlinkTarget.child.name} from ${unlinkTarget.parent.name}?` : ""}
          confirmText="Unlink"
          variant="destructive"
          onConfirm={confirmUnlink}
        />
      </div>
    </AuthGuard>
  );
}
