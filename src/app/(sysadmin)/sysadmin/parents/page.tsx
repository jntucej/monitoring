"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { UserPlus, Users, Search, RefreshCw, X, Link as LinkIcon, KeyRound, Trash2, Copy, Check, Loader2 } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { getAuthHeaders } from "@/lib/utils";
import { EnrollmentCodeModal } from "@/components/sysadmin/EnrollmentCodeModal";

interface ParentRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  uniqueId: string | null;
  status: string;
  children: Array<{ id: string; roll: string; name: string; status: string }>;
}

interface StudentOption {
  id: string;
  name: string;
  roll: string;
  uniqueId?: string;
  email: string;
}

interface CreatedParent {
  password: string | null;
  uniqueId?: string;
}

export default function SysAdminParentsPage() {
  const { addToast } = useUIStore();
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showIncludeUnlinked, setShowIncludeUnlinked] = useState(false);

  // Create-parent modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", phone: "" });
  const [creating, setCreating] = useState(false);
  const [createdParent, setCreatedParent] = useState<CreatedParent | null>(null);

  // Link modal state
  const [linkTarget, setLinkTarget] = useState<{ student: StudentOption } | null>(null);
  const [linkParentId, setLinkParentId] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);

  // Enrollment modal
  const [enrollmentUser, setEnrollmentUser] = useState<{ id: string; name: string } | null>(null);

  // Copy state for the one-time password
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        fetch(
          `/api/parents?role=guardian&includeUnlinked=${showIncludeUnlinked ? "true" : "false"}&t=${Date.now()}`,
          { headers: getAuthHeaders(), cache: "no-store" }
        ),
        fetch(`/api/students?t=${Date.now()}`, { headers: getAuthHeaders(), cache: "no-store" }),
      ]);
      const pJson = await pRes.json().catch(() => ({ success: false, data: [] }));
      const sJson = await sRes.json().catch(() => ({ success: false, data: [] }));
      setParents(Array.isArray(pJson.data) ? pJson.data : []);
      setStudents(
        Array.isArray(sJson.data)
          ? sJson.data.map((s: any) => ({
              id: s.id,
              name: s.name || s.fullName || s.roll || s.uniqueId || "—",
              roll: s.roll || s.uniqueId || "—",
              uniqueId: s.uniqueId,
              email: s.email || "",
            }))
          : []
      );
    } catch {
      addToast({ variant: "error", title: "Error", message: "Failed to load parents" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showIncludeUnlinked]);

  const filteredParents = useMemo(() => {
    if (!search) return parents;
    const q = search.toLowerCase();
    return parents.filter((p) =>
      `${p.name} ${p.email} ${p.uniqueId || ""} ${p.children.map((c) => c.name).join(" ")}`.toLowerCase().includes(q)
    );
  }, [parents, search]);

  // Students without a guardian link (the "available" pool for linking)
  const linkedStudentIds = useMemo(() => {
    const ids = new Set<string>();
    parents.forEach((p) => p.children.forEach((c) => ids.add(c.id)));
    return ids;
  }, [parents]);

  const unlinkedStudents = useMemo(
    () => students.filter((s) => !linkedStudentIds.has(s.id)),
    [students, linkedStudentIds]
  );

  const handleCreateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreatedParent(null);
    try {
      const res = await fetch("/api/parents", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          email: createForm.email.trim() || undefined,
          phone: createForm.phone.trim() || undefined,
          role: "guardian",
        }),
      });
      const json = await res.json().catch(() => ({ success: false }));
      if (res.ok && json.success) {
        setCreatedParent({
          password: json.data?.password ?? null,
          uniqueId: json.data?.uniqueId,
        });
        addToast({ variant: "success", title: "Created", message: `Parent ${createForm.name} created.` });
        load();
      } else {
        addToast({ variant: "error", title: "Error", message: json.error?.message || "Failed to create parent." });
      }
    } catch {
      addToast({ variant: "error", title: "Network error", message: "Could not create parent." });
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
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: linkTarget.student.id, parentUserId: linkParentId }),
      });
      const json = await res.json().catch(() => ({ success: false }));
      if (res.ok && json.success) {
        addToast({ variant: "success", title: "Linked", message: `Guardian linked to ${linkTarget.student.name}.` });
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

  const handleUnlink = async (parent: ParentRow, child: ParentRow["children"][0]) => {
    const confirmed = confirm(`Unlink ${child.name} from ${parent.name}?`);
    if (!confirmed) return;
    try {
      const res = await fetch("/api/parents/link", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
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
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">
              <Users className="w-7 h-7 text-violet-400" />
              Parents &amp; Guardians
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Create parent accounts, link them to students, and manage guardian access. {parents.length} parents.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 shadow-lg shadow-violet-900/30"
            >
              <UserPlus className="w-4 h-4" /> New Parent
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search parents or linked students…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0d1220] border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showIncludeUnlinked}
              onChange={(e) => setShowIncludeUnlinked(e.target.checked)}
              className="accent-violet-500"
            />
            Include unlinked parents
          </label>
        </div>

        {/* Parents table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0d1220]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-slate-900/60 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Parent</th>
                  <th className="px-4 py-3 text-left">Unique ID</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Linked Students</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading…
                    </td>
                  </tr>
                ) : filteredParents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      No parents found. {showIncludeUnlinked ? "" : "Unlinked parents are hidden — toggle the filter to see them."}
                    </td>
                  </tr>
                ) : (
                  filteredParents.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-violet-400">{p.uniqueId || "—"}</td>
                      <td className="px-4 py-3 text-slate-300 text-xs">{p.email}</td>
                      <td className="px-4 py-3 text-xs">
                        {p.children.length === 0 ? (
                          <span className="text-slate-500">None linked</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {p.children.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => handleUnlink(p, c)}
                                className="group flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[11px] text-slate-200 hover:bg-rose-900/40 hover:border-rose-800 transition-colors"
                                title={`Unlink ${c.name}`}
                              >
                                <span className="font-medium">{c.name}</span>
                                <span className="font-mono text-violet-400 group-hover:text-rose-300">{c.roll}</span>
                                <Trash2 className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEnrollmentUser({ id: p.id, name: p.name })}
                            className="p-1.5 rounded-lg hover:bg-slate-700 text-emerald-400"
                            title="Enrollment code"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Unlinked students pool — link them to a parent */}
        {unlinkedStudents.length > 0 && (
          <div className="border border-slate-800 rounded-xl bg-[#0d1220] p-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-violet-400" /> Students Without a Linked Guardian ({unlinkedStudents.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {unlinkedStudents.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setLinkTarget({ student: s });
                    setLinkParentId("");
                  }}
                  className="flex items-center justify-between pl-3 pr-2 py-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-violet-600 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-white truncate">{s.name}</div>
                    <div className="font-mono text-[10px] text-violet-400">{s.roll}</div>
                  </div>
                  <span className="ml-2 shrink-0 text-[10px] uppercase tracking-wider text-violet-400 font-bold">Link</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Create parent modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#0d1220] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <h2 className="text-lg font-bold text-white">New Parent Account</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateParent} className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Email</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500"
                    placeholder="parent@jntuhcej.ac.in (auto from name when blank)"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* One-time password reveal */}
                {createdParent?.password ? (
                  <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/30 space-y-2">
                    <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">One-Time Initial Password</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-mono font-bold tracking-widest text-violet-300 select-all flex-1">
                        {createdParent.password}
                      </p>
                      <button
                        type="button"
                        onClick={() => copyPassword(createdParent.password!)}
                        className="flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Share at <code className="font-mono text-violet-400">/login</code> with the user&rsquo;s email.
                      This password will be shown only once.
                    </p>
                  </div>
                ) : null}

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                  >
                    {createdParent ? "Done" : "Cancel"}
                  </button>
                  {!createdParent && (
                    <button
                      type="submit"
                      disabled={creating || !createForm.name.trim()}
                      className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 disabled:opacity-50 flex items-center gap-2"
                    >
                      {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                      Create Parent
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Link modal */}
        {linkTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#0d1220] border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-violet-400" />
                  Link Guardian — {linkTarget.student.name}
                </h2>
                <button onClick={() => setLinkTarget(null)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-slate-400">
                  Linking <strong className="text-white">{linkTarget.student.name}</strong> ({linkTarget.student.roll}) to a
                  guardian. If no suitable guardian exists, create one from the New Parent button.
                </p>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Guardian</label>
                  <select
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
                    onClick={() => setLinkTarget(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
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
      </div>
    </AuthGuard>
  );
}
