"use client";

import React, { useState, useEffect } from "react";
import { 
  UserPlus, 
  Users, 
  Clock, 
  LogOut, 
  CheckCircle2, 
  QrCode, 
  Search, 
  Phone, 
  Building, 
  Calendar,
  AlertCircle,
  FileText
} from "lucide-react";
import { PersonBadge } from "@/components/shared/PersonBadge";
import { QRCode } from "react-qrcode-logo";

interface VisitorLog {
  id: string;
  person_id: string;
  check_in_at: string;
  check_out_at?: string;
  host_person_id?: string;
  purpose?: string;
  status: "active" | "completed";
  person?: {
    id: string;
    unique_id: string;
    full_name: string;
    phone?: string;
    email?: string;
    visitor_host?: string;
    visitor_purpose?: string;
    qr_code?: string;
  };
}

export default function VisitorManagementPage() {
  const [activeTab, setActiveTab] = useState<"register" | "active" | "logs">("active");
  const [visitors, setVisitors] = useState<VisitorLog[]>([]);
  const [completedVisitors, setCompletedVisitors] = useState<VisitorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Registration Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [visitorHost, setVisitorHost] = useState("");
  const [visitorPurpose, setVisitorPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [newVisitorPass, setNewVisitorPass] = useState<any | null>(null);

  const fetchVisitors = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resActive, resLogs] = await Promise.all([
        fetch("/api/visitors?status=active"),
        fetch("/api/visitors?status=completed")
      ]);

      const dataActive = await resActive.json();
      const dataLogs = await resLogs.json();

      if (dataActive.success) {
        setVisitors(dataActive.data || []);
      }
      if (dataLogs.success) {
        setCompletedVisitors(dataLogs.data || []);
      }
    } catch (err) {
      console.error("Failed to load visitors:", err);
      setError("Failed to connect to visitor server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, []);

  const handleRegisterVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          visitorHost: visitorHost.trim() || undefined,
          visitorPurpose: visitorPurpose.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to register visitor");
      }

      setNewVisitorPass(data.data);
      setFullName("");
      setPhone("");
      setEmail("");
      setVisitorHost("");
      setVisitorPurpose("");
      fetchVisitors();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async (personId: string) => {
    try {
      const res = await fetch("/api/visitors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check-out",
          personId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        fetchVisitors();
      } else {
        alert(data.error?.message || "Failed to check out visitor");
      }
    } catch (err) {
      console.error("Check out error:", err);
      alert("Failed to check out visitor");
    }
  };

  const filteredActiveVisitors = visitors.filter((v) => {
    const p = v.person;
    if (!p) return false;
    const q = searchQuery.toLowerCase();
    return (
      p.full_name?.toLowerCase().includes(q) ||
      p.unique_id?.toLowerCase().includes(q) ||
      p.visitor_host?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto px-4 sm:px-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <Users className="w-7 h-7 text-amber-500" />
            Visitor Access Control
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Register guests, issue temporary digital QR passes, and manage real-time campus check-ins/outs
          </p>
        </div>

        {/* Stats Pills */}
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg text-center">
            <span className="block text-xs font-semibold text-amber-600 dark:text-amber-400">Active Guests</span>
            <span className="text-lg font-bold text-amber-700 dark:text-amber-300">{visitors.length}</span>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-center">
            <span className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400">Total Visits</span>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {visitors.length + completedVisitors.length}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab("active")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "active"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Users className="w-4 h-4" />
          Active Visitors ({visitors.length})
        </button>

        <button
          onClick={() => setActiveTab("register")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "register"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <UserPlus className="w-4 h-4" />
          New Visitor Check-In
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "logs"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Clock className="w-4 h-4" />
          Visit History
        </button>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{typeof error === "string" ? error : (error as any)?.message || String(error)}</p>
        </div>
      )}

      {/* TAB 1: ACTIVE VISITORS */}
      {activeTab === "active" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search visitor, ID, host..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
            <button
              onClick={fetchVisitors}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors underline"
            >
              Refresh Active List
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-[var(--text-muted)]">Loading visitor records...</div>
          ) : filteredActiveVisitors.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-[var(--border)] rounded-xl space-y-2">
              <Users className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
              <p className="text-sm text-[var(--text-muted)]">No active visitors on campus right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredActiveVisitors.map((v) => {
                const p = v.person;
                if (!p) return null;

                return (
                  <div
                    key={v.id}
                    className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-[var(--text-primary)]">{p.full_name}</h3>
                          <PersonBadge type="visitor" />
                        </div>
                        <p className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">
                          ID: {p.unique_id}
                        </p>
                      </div>

                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <QRCode value={p.unique_id} size={48} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)] border-t border-[var(--border)] pt-3">
                      <div>
                        <span className="block font-medium text-[var(--text-primary)] flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-amber-500" /> Host
                        </span>
                        <span>{p.visitor_host || "N/A"}</span>
                      </div>

                      <div>
                        <span className="block font-medium text-[var(--text-primary)] flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-amber-500" /> Purpose
                        </span>
                        <span className="truncate block">{p.visitor_purpose || "General Visit"}</span>
                      </div>

                      <div>
                        <span className="block font-medium text-[var(--text-primary)] flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-amber-500" /> Phone
                        </span>
                        <span>{p.phone || "Not provided"}</span>
                      </div>

                      <div>
                        <span className="block font-medium text-[var(--text-primary)] flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-500" /> Check-In
                        </span>
                        <span>{new Date(v.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => handleCheckOut(p.id)}
                        className="w-full py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Check Out Visitor
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REGISTER VISITOR */}
      {activeTab === "register" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-500" />
              Visitor Entry Registration
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Fill out guest credentials to issue an active QR pass for campus access.
            </p>

            <form onSubmit={handleRegisterVisitor} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Verma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-[var(--border)] focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-[var(--border)] focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="visitor@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-[var(--border)] focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Host / Department Being Visited</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. K. Sridhar / CSE Dept"
                  value={visitorHost}
                  onChange={(e) => setVisitorHost(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-[var(--border)] focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Purpose of Visit</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Parent meeting / Guest lecture / Vendor delivery"
                  value={visitorPurpose}
                  onChange={(e) => setVisitorPurpose(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-[var(--border)] focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !fullName.trim()}
                className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? "Registering & Checking In..." : "Issue Digital Visitor Pass"}
              </button>
            </form>
          </div>

          {/* Generated QR Modal Card */}
          {newVisitorPass ? (
            <div className="p-6 rounded-xl border border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/20 shadow-md space-y-4 flex flex-col items-center text-center justify-center">
              <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="font-extrabold text-lg text-[var(--text-primary)]">{newVisitorPass.fullName}</h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-mono font-bold mt-0.5">
                  Visitor ID: {newVisitorPass.uniqueId}
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl shadow-inner border border-slate-200">
                <QRCode value={newVisitorPass.uniqueId} size={160} />
              </div>

              <div className="w-full text-xs text-[var(--text-muted)] space-y-1 bg-[var(--surface)] p-3 rounded-lg border border-[var(--border)]">
                <p><span className="font-semibold text-[var(--text-primary)]">Host:</span> {newVisitorPass.visitorHost || "N/A"}</p>
                <p><span className="font-semibold text-[var(--text-primary)]">Purpose:</span> {newVisitorPass.visitorPurpose || "General Visit"}</p>
              </div>

              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                ✅ Checked in automatically! Show QR at gate to exit campus.
              </p>
            </div>
          ) : (
            <div className="p-8 rounded-xl border border-dashed border-[var(--border)] flex flex-col items-center justify-center text-center space-y-3 text-[var(--text-muted)]">
              <QrCode className="w-12 h-12 opacity-30" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Visitor Pass Preview</p>
                <p className="text-xs max-w-xs">Fill out the form to generate a temporary digital QR pass for instant gate entry.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: VISIT HISTORY */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <h3 className="font-bold text-sm text-[var(--text-primary)] mb-3">Completed Visitor Logs</h3>

            {completedVisitors.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-6">No historical completed visitor logs found.</p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {completedVisitors.map((v) => {
                  const p = v.person;
                  return (
                    <div key={v.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-bold text-[var(--text-primary)] text-sm">{p?.full_name || "Visitor"}</span>
                        <span className="ml-2 font-mono text-amber-600 dark:text-amber-400">({p?.unique_id})</span>
                        <p className="text-[var(--text-muted)] mt-0.5">
                          Host: {p?.visitor_host || "N/A"} • Purpose: {p?.visitor_purpose || "General Visit"}
                        </p>
                      </div>

                      <div className="text-right sm:text-right text-[var(--text-muted)] shrink-0">
                        <p className="flex items-center gap-1 sm:justify-end">
                          <Calendar className="w-3 h-3 text-amber-500" />
                          In: {new Date(v.check_in_at).toLocaleString()}
                        </p>
                        {v.check_out_at && (
                          <p className="flex items-center gap-1 sm:justify-end text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            Out: {new Date(v.check_out_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
