"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { User, Shield, Bell, Lock, KeyRound, Camera, Smartphone, Mail, Save } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";

export default function ProfilePage() {
  const { user, token } = useAuthStore();
  const currentSessionToken = user?.currentSessionToken || token;
  const { addToast } = useUIStore();

  const [activeTab, setActiveTab] = useState<"personal" | "security" | "notifications">("personal");
  const [loading, setLoading] = useState(false);

  // Personal state
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || user?.avatarUrl || "");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notification state
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(true);
  const [quietHoursStart, setQuietHoursStart] = useState("22:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState("06:00");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setPhotoUrl(user.photoUrl || user.avatarUrl || "");
    }
  }, [user]);

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-User-Id": user.id,
        "X-User-Role": user.role,
      };
      if (currentSessionToken) headers["X-Session-Token"] = currentSessionToken;

      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ name, phone, photoUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || "Failed to update profile");

      addToast({ title: "Success", message: "Profile updated successfully", variant: "success" });
    } catch (err: any) {
      addToast({ title: "Update Failed", message: err.message, variant: "error" });
    } finally {
      setLoading(false);
    }
  };
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast({ title: "Validation Error", message: "Passwords do not match", variant: "error" });
      return;
    }
    if (newPassword.length < 6) {
      addToast({ title: "Validation Error", message: "Password must be at least 6 characters", variant: "error" });
      return;
    }

    setPasswordLoading(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-User-Id": user?.id || "",
        "X-User-Role": user?.role || "",
      };
      if (currentSessionToken) headers["X-Session-Token"] = currentSessionToken;

      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers,
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || "Failed to change password");

      addToast({ title: "Success", message: "Password updated successfully", variant: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      addToast({ title: "Failed", message: err.message, variant: "error" });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-User-Id": user.id,
        "X-User-Role": user.role,
      };
      if (currentSessionToken) headers["X-Session-Token"] = currentSessionToken;

      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          notificationPreferences: {
            email: emailNotifs,
            sms: smsNotifs,
            quietHours: { start: quietHoursStart, end: quietHoursEnd },
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || "Failed to save preferences");

      addToast({ title: "Success", message: "Notification preferences saved", variant: "success" });
    } catch (err: any) {
      addToast({ title: "Error", message: err.message, variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard allowedRoles={["student", "faculty", "staff", "warden", "operator", "admin", "sysadmin", "parent", "guardian", "worker"]}>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-sky-500/20 border-2 border-sky-500/40 flex items-center justify-center overflow-hidden text-2xl font-black text-sky-300">
              {photoUrl ? (
                <img src={photoUrl} alt={user?.name || "Avatar"} className="w-full h-full object-cover" />
              ) : (
                user?.name?.slice(0, 2).toUpperCase() || "ME"
              )}
            </div>
            <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-sky-600 text-white shadow-md">
              <Camera className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-center sm:text-left space-y-1">
            <h1 className="text-2xl font-bold text-white">{user?.name || "User Profile"}</h1>
            <p className="text-xs text-[var(--text-muted)] font-mono">{user?.identifier || user?.email || user?.id}</p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Shield className="w-3 h-3" /> Role: {user?.role}
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-[var(--border)] gap-6">
          <button
            onClick={() => setActiveTab("personal")}
            className={`pb-3 text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "personal"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-[var(--text-muted)] hover:text-white"
            }`}
          >
            <User className="w-4 h-4" /> Personal Details
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`pb-3 text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "security"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-[var(--text-muted)] hover:text-white"
            }`}
          >
            <Lock className="w-4 h-4" /> Security
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`pb-3 text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "notifications"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-[var(--text-muted)] hover:text-white"
            }`}
          >
            <Bell className="w-4 h-4" /> Notifications
          </button>
        </div>

        {/* Personal Details */}
        {activeTab === "personal" && (
          <form onSubmit={handleSavePersonal} className="bg-[var(--bg-surface)] border border-[var(--border)] p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-sky-400" /> Basic Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-[var(--text-muted)] font-medium">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[var(--text-muted)] font-medium">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[var(--text-muted)] font-medium">Profile Photo URL</label>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-md"
              >
                <Save className="w-4 h-4" /> Save Profile Details
              </button>
            </div>
          </form>
        )}
        {activeTab === "security" && (
          <form onSubmit={handleChangePassword} className="bg-[var(--bg-surface)] border border-[var(--border)] p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-sky-400" /> Change Account Password
            </h2>
            <div className="space-y-3 text-xs max-w-md">
              <div className="space-y-1">
                <label className="text-[var(--text-muted)] font-medium">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[var(--text-muted)] font-medium">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[var(--text-muted)] font-medium">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={passwordLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-md"
              >
                <Lock className="w-4 h-4" /> {passwordLoading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        )}
        {activeTab === "notifications" && (
          <form onSubmit={handleSaveNotifications} className="bg-[var(--bg-surface)] border border-[var(--border)] p-6 rounded-2xl space-y-6">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-sky-400" /> Preferences
            </h2>
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-sky-400" />
                  <div>
                    <p className="font-bold text-white">Email Notifications</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Receive gate pass alerts and approvals via email</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={emailNotifs}
                  onChange={(e) => setEmailNotifs(e.target.checked)}
                  className="w-4 h-4 accent-sky-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4 text-purple-400" />
                  <div>
                    <p className="font-bold text-white">SMS Gate Alerts</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Send SMS notifications for gate entries & exits</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={smsNotifs}
                  onChange={(e) => setSmsNotifs(e.target.checked)}
                  className="w-4 h-4 accent-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-[var(--text-muted)] font-medium">Quiet Hours Start</label>
                  <input
                    type="time"
                    value={quietHoursStart}
                    onChange={(e) => setQuietHoursStart(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[var(--text-muted)] font-medium">Quiet Hours End</label>
                  <input
                    type="time"
                    value={quietHoursEnd}
                    onChange={(e) => setQuietHoursEnd(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-md"
              >
                <Save className="w-4 h-4" /> Save Preferences
              </button>
            </div>
          </form>
        )}
      </div>
    </AuthGuard>
  );
}
