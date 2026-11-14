"use client";
import { errMsg } from "@/lib/err-msg";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {User as UserIcon, Loader2, Save}  from "lucide-react";
import { ParticleField } from "@/components/cinematic/ParticleField";
import { AmbientGlow } from "@/components/cinematic/AmbientGlow";

interface Profile {
  id: string; name: string; email: string; phone: string | null; role: string;
  status: string; uniqueId: string | null; photoUrl: string | null;
  departmentId: string | null;
  studentDetails?: { roll?: string; year?: number; section?: string; hostel_block?: string; room_number?: string } | null;
  employeeDetails?: { employee_id?: string; designation?: string; department_id?: string } | null;
}

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const state = useAuthStore.getState();
  const token = state.token;
  if (token) return { Authorization: `Bearer ${token}` };
  try {
    const raw = localStorage.getItem("gate-monitor-auth") || localStorage.getItem("auth-store");
    const t = raw ? JSON.parse(raw)?.state?.token : null;
    if (t) return { Authorization: `Bearer ${t}` };
  } catch {}
  return {};
}

function roleLabel(role: string): string {
  const map: Record<string, string> = { sysadmin: "System Administrator", admin: "Administrator", operator: "Gate Operator", student: "Student", faculty: "Faculty", staff: "Staff", worker: "Worker", visitor: "Visitor", parent: "Parent", guardian: "Guardian", hod: "Head of Department", supervisor: "Supervisor" };
  return map[role] || role;
}

export function ProfilePersonalPanel() {
  const addToast = useUIStore((s) => s.success);
  const addError = useUIStore((s) => s.error);
  const setUser = useAuthStore((s) => s.setUser);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile", { headers: authHeaders() });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load profile");
      setProfile(json.data);
      setName(json.data.name ?? "");
      setPhone(json.data.phone ?? "");
    } catch (e) { addError(errMsg(e) || "Failed to load profile"); }
    finally { setLoading(false); }
  }, [addError]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSavingName(true);
    try {
      const res = await fetch("/api/profile", { method: "PATCH", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ name, phone }) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Update failed");
      setProfile({ ...profile, name, phone });
      const current = useAuthStore.getState().user;
      if (current) setUser({ ...current, name });
      addToast("Profile updated");
    } catch (e) { addError(errMsg(e) || "Update failed"); }
    finally { setSavingName(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin size-6 text-action-primary" /></div>;
  if (!profile) return <div className="surface-card max-w-2xl mx-auto mt-16 p-8 text-center"><p className="text-text-secondary">Could not load profile.</p><Button className="mt-4" onClick={load}>Retry</Button></div>;

  const initials = profile.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg-base text-text-primary">
      <div aria-hidden="true" className="absolute inset-0 bg-surface-muted" />
      <ParticleField color="var(--unit-c)" />
      <AmbientGlow color="rgba(139,92,246,0.18)" />
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="surface-card p-6 flex items-center gap-5">
          <div className="w-6 h-6 rounded-card bg-action-success flex items-center justify-center text-white text-2xl font-bold">{initials || <UserIcon className="size-6" />}</div>
          <div className="flex-1 min-w-4">
            <p className="text-sm font-medium text-text-secondary mb-3">{profile.name}</p>
            <p className="text-sm text-text-secondary truncate">{profile.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="success">{roleLabel(profile.role)}</Badge>
              <Badge variant={profile.status === "ACTIVE" ? "success" : "error"}>{profile.status}</Badge>
            </div>
          </div>
        </div>

        <form onSubmit={saveName} className="surface-card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-text-primary">Personal details</h2>
          <div>
            <label className="block text-sm mb-1 text-text-secondary">Full name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required minLength={2} maxLength={100} />
            <p className="text-xs text-text-muted mt-1">This is the name shown on gate passes, logs and the campus dashboard.</p>
          </div>
          <div>
            <label className="block text-sm mb-1 text-text-secondary">Email</label>
            <Input value={profile.email} disabled />
            <p className="text-xs text-text-muted mt-1">Email changes require administrator approval.</p>
          </div>
          <div>
            <label className="block text-sm mb-1 text-text-secondary">Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" type="tel" />
          </div>
          {profile.uniqueId && (
            <div>
              <label className="block text-sm mb-1 text-text-secondary">{profile.role === "student" ? "Roll number" : "Employee ID"}</label>
              <Input value={profile.uniqueId} disabled />
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={savingName}>
              {savingName ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : <><Save className="w-4 h-4 mr-2" /> Save changes</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProfilePersonalPage() {
  return <AuthGuard><ProfilePersonalPanel /></AuthGuard>;
}
