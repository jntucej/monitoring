export const dynamic = "force-dynamic";
"use client";

import { useState, useCallback, useEffect } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { useUIStore } from "@/stores/uiStore";
import { useApi } from "@/hooks/useApi";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Users, Plus, Search, Trash2, Link as LinkIcon, Unlink,
  Check, Copy, KeyRound, ShieldAlert, X, Loader2, UserCheck,
} from "lucide-react";

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
      <div className="bg-[#0d1220] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-violet-400" /> Enrollment Code — {userName}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-slate-400">
          Generate a one-time secure onboarding code for this parent to set their password and sign in directly.
        </p>
        {codeData?.code ? (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Secure Code</span>
            <span className="text-2xl font-mono font-black text-emerald-400 tracking-wider">{codeData.code}</span>
            <p className="text-[11px] text-slate-400">Provide this code to the guardian. Expires in 24 hours.</p>
          </div>
        ) : (
          <button type="button" onClick={generateCode} disabled={loading}
            className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
            Generate Onboarding Code
          </button>
        )}
        <div className="flex justify-end pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold">Done</button>
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
  const [loading, setLoading] = useState(true);
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
              <Users className="w-7 h-7 text-violet-400" />
              Parents &amp; Guardians Registry
            </p>
            <p className="text-sm text-slate-400 mt-1">Manage guardian accounts, student-parent relationships, and portal access credentials.</p>
          </div>
          <button type="button" onClick={() => { setShowCreate(true); setCreatedResult(null); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 self-start">
            <Plus className="w-4 h-4" /> Register New Parent
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guardians by name, email, phone or student roll…"
            className="w-full pl-10 pr-4 py-2.5 bg-[#0d1220] border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
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
              <div key={p.id} className="rounded-2xl border border-slate-800 bg-[#0d1220] p-5 space-y-4 shadow-xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-violet-400" /> {p.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{p.email || "No email"} · {p.phone || "No phone"}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button type="button" onClick={() => setEnrollmentUser({ id: p.id, name: p.name })}
                      className="px-2.5 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 text-xs font-semibold flex items-center gap-1" title="Generate enrollment code">
                      <KeyRound className="w-3.5 h-3.5" /> Code
                    </button>
                  </div>
                </div>

                {/* Linked children */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Linked Students</span>
                  {p.children && p.children.length > 0 ? (
                    <div className="space-y-1.5">
                      {p.children.map((c) => (
                        <div key={c.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                          <div>
                            <span className="font-semibold text-white">{c.name}</span>
                            <span className="font-mono text-violet-400 ml-2">{c.roll || c.uniqueId}</span>
                            <span className="text-slate-500 ml-2">({c.department || "General"})</span>
                          </div>
                          <button type="button" onClick={() => handleUnlink(p, c)}
                            className="text-slate-500 hover:text-rose-400 p-1" title="Unlink student">
                            <Unlink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No students linked to this guardian yet.</p>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* Unlinked students section */}
        <div className="rounded-2xl border border-slate-800 bg-[#0d1220] p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-emerald-400" /> Students Awaiting Guardian Link
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-500 uppercase border-b border-slate-800">
                  <th className="pb-2.5 px-3">Student</th>
                  <th className="pb-2.5 px-3">Roll / ID</th>
                  <th className="pb-2.5 px-3">Department</th>
                  <th className="pb-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {unlinkedStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3 font-semibold text-white">{s.name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{s.roll || s.uniqueId}</td>
                    <td className="py-2.5 px-3 text-slate-400">{s.department || "—"}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button type="button" onClick={() => setLinkTarget({ student: s })}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
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
            <form onSubmit={createParent} className="bg-[#0d1220] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-violet-400" /> Register Parent / Guardian
                </h2>
                <button type="button" onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              {createdResult ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
                    <p className="font-bold">Guardian Account Created Successfully!</p>
                    <p>Name: {createdResult.name}</p>
                    <p>Email: {createdResult.email}</p>
                    {createdResult.plainPassword && (
                      <div className="mt-2 pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                        <span className="font-mono bg-black/30 px-2 py-1 rounded text-white">{createdResult.plainPassword}</span>
                        <button type="button" onClick={() => copyPassword(createdResult.plainPassword!)}
                          className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-lg text-xs flex items-center gap-1">
                          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? "Copied" : "Copy Password"}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="button" onClick={() => { setShowCreate(false); setCreatedResult(null); }}
                      className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold">Done</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Full Name *</label>
                      <input required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                        placeholder="e.g. Rajesh Sharma" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-violet-500" />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Email (portal login) *</label>
                      <input type="email" required value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                        placeholder="e.g. rajesh@example.com" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-violet-500" />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Phone Number</label>
                      <input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                        placeholder="e.g. +91 9876543210" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-violet-500" />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Student Roll Number (optional auto-link)</label>
                      <input value={createForm.studentRoll} onChange={(e) => setCreateForm({ ...createForm, studentRoll: e.target.value })}
                        placeholder="e.g. 24JJ1A0501" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-violet-500" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl hover:bg-slate-800 text-slate-300 text-xs font-semibold">Cancel</button>
                    <button type="submit" disabled={creating} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold disabled:opacity-50">
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
            <div className="bg-[#0d1220] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-emerald-400" /> Link Guardian to Student
                </h3>
                <button type="button" onClick={() => setLinkTarget(null)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-slate-400">
                  Linking <strong className="text-white">{linkTarget.student.name}</strong> ({linkTarget.student.roll}) to a
                  guardian. If no suitable guardian exists, create one from the New Parent button.
                </p>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1" htmlFor="guardian">Guardian</label>
                  <select id="guardian"
                    value={linkParentId}
                    onChange={(e) => setLinkParentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500"
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
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleLink}
                    disabled={linkBusy || !linkParentId}
                    className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 disabled:opacity-50 flex items-center gap-2"
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
