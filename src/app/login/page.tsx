"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Lock, User, Eye, EyeOff, LogIn, Shield } from "lucide-react";

const CREDENTIALS = [
  { role: "operator" as const, login: "OP001", password: "1234", gate: "gate-1" },
  { role: "operator" as const, login: "OP002", password: "5678", gate: "gate-2" },
  { role: "supervisor" as const, login: "SV001", password: "3456", gate: "gate-1" },
  { role: "admin" as const, login: "AD001", password: "1234", gate: null },
  { role: "parent" as const, login: "PA001", password: "1234", gate: null },
];

const roleLabels: Record<string, { label: string; icon: any; color: string; bg: string; href: string }> = {
  operator: { label: "Gate Operator", icon: Shield, color: "text-emerald-400", bg: "bg-emerald-500/10", href: "/operator/gate-1" },
  supervisor: { label: "Gate Supervisor", icon: Shield, color: "text-sky-400", bg: "bg-sky-500/10", href: "/supervisor/live" },
  admin: { label: "Admin", icon: Building2, color: "text-violet-400", bg: "bg-violet-500/10", href: "/admin" },
  parent: { label: "Parent", icon: User, color: "text-rose-400", bg: "bg-rose-500/10", href: "/parent" },
  student: { label: "Student", icon: User, color: "text-blue-400", bg: "bg-blue-500/10", href: "/student" },
};

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState("operator");
  const [login, setLogin] = useState("OP001");
  const [password, setPassword] = useState("1234");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });

    const data = await res.json();

    if (!data.success) {
      setError(data.error?.message || "Login failed");
      setLoading(false);
      return;
    }

    localStorage.setItem("gate-monitor-token", data.data.token);
    localStorage.setItem("gate-monitor-role", data.data.user.role);
    localStorage.setItem("gate-monitor-user", JSON.stringify(data.data.user));

    const user = data.data.user;
    let href = roleLabels[user.role]?.href || "/";
    if (user.role === "operator" && user.gateId) {
      href = `/operator/${user.gateId}`;
    }
    router.push(href);
  };

  const selected = roleLabels[selectedRole];
  const cred = CREDENTIALS.find((c) => c.role === selectedRole);

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-[var(--bg-base)] p-6">
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] mb-4">
            <Building2 className="w-8 h-8 text-[var(--action-primary)]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">JNTUH-UCoEJ Gate Monitor</h1>
          <p className="text-[var(--text-secondary)] text-lg">Login to your portal</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-8"
        >
          {/* Role Selector */}
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase text-[var(--text-muted)] mb-3">Select Role</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {Object.entries(roleLabels).map(([role, info]) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => { setSelectedRole(role); setLogin(cred?.login || ""); setPassword(cred?.password || ""); if (role === "student") setLogin("STU001"); }}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    selectedRole === role
                      ? "border-[var(--focus-ring)] bg-[var(--bg-elevated)]"
                      : "border-[var(--border)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <div className={`text-2xl mb-1 ${info.color}`}>{<info.icon className="w-5 h-5 mx-auto" />}</div>
                  <span className={`text-xs font-medium ${selectedRole === role ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>{info.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase text-[var(--text-muted)] mb-2">Login ID</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--focus-ring)] focus:ring-1 focus:ring-[var(--focus-ring)] transition-colors"
                  placeholder="Enter your employee ID or email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-[var(--text-muted)] mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 pr-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--focus-ring)] focus:ring-1 focus:ring-[var(--focus-ring)] transition-colors"
                  placeholder="Enter password"
                  required
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]">
                  {showPwd ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </motion.div>
            )}

            {cred && (
              <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-base)] p-3 rounded-lg border border-[var(--border)]">
                Demo credentials for <span className="font-semibold text-[var(--text-primary)]">{selected.label}</span>:
                <span className="ml-1">Login: </span><code className="bg-[var(--border)] px-1 rounded">{cred.login}</code>,
                <span className="ml-1">Password: </span><code className="bg-[var(--border)] px-1 rounded">{cred.password}</code>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-lg bg-[var(--action-primary)] text-white font-semibold text-lg flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <LogIn className="w-5 h-5" />}
              {loading ? "Logging in..." : `Login as ${selected.label}`}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
