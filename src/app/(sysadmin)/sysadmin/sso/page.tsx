"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Shield, RefreshCw, Save } from "lucide-react";

export default function SSOConfigPage() {
  const { user, token } = useAuthStore();
  const sessionToken = user?.currentSessionToken || token;
  const { addToast } = useUIStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    providerId: "google",
    enabled: true,
    clientId: "",
    issuerUrl: "",
    groupMappingsJson: "{}",
  });

  const getHeaders = () => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    if (sessionToken) h["X-Session-Token"] = sessionToken;
    return h;
  };

  const fetchSSO = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sso", { headers: getHeaders() });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setConfig({
          providerId: json.data.providerId || "google",
          enabled: Boolean(json.data.enabled),
          clientId: json.data.clientId || "",
          issuerUrl: json.data.issuerUrl || "",
          groupMappingsJson: JSON.stringify(json.data.groupMappings || {}, null, 2),
        });
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Failed to load SSO" });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchSSO(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let parsedMappings = {};
      try { parsedMappings = JSON.parse(config.groupMappingsJson); }
      catch {
        addToast({ variant: "error", title: "Invalid JSON", message: "Mappings must be valid JSON" });
        setSaving(false); return;
      }
      const res = await fetch("/api/admin/sso", {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          providerId: config.providerId,
          enabled: config.enabled,
          clientId: config.clientId,
          issuerUrl: config.issuerUrl,
          groupMappings: parsedMappings,
        }),
      });
      const json = await res.json();
      if (json.success) {
        addToast({ variant: "success", title: "SSO Saved", message: "SSO updated successfully." });
        fetchSSO();
      } else { addToast({ variant: "error", title: "Error", message: json.error?.message || "Failed to update SSO" }); }
    } catch { addToast({ variant: "error", title: "Error", message: "Network error saving SSO" }); }
    finally { setSaving(false); }
  };

  return (
    <AuthGuard allowedRoles={["sysadmin"]}>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-500" /> SSO Configuration
            </h1>
            <p className="text-sm text-gray-500">Configure OAuth 2.0 / OpenID Connect identity provider federation.</p>
          </div>
          <Button onClick={fetchSSO} variant="secondary" size="sm" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Identity Provider Credentials</CardTitle>
            <Badge variant={config.enabled ? "success" : "offline"}>
              {config.enabled ? "SSO ACTIVE" : "SSO DISABLED"}
            </Badge>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-6 text-center text-xs text-gray-500">Loading SSO parameters...</div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg">
                  <input
                    type="checkbox"
                    id="sso_enabled"
                    checked={config.enabled}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="sso_enabled" className="text-sm font-semibold cursor-pointer">
                    Enable Single Sign-On (SSO / OIDC Authentication)
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1 uppercase">Provider Type</label>
                  <Select
                    options={[
                      { value: "google", label: "Google Workspace / OAuth 2.0" },
                      { value: "azure_ad", label: "Microsoft Azure AD / Entra ID" },
                      { value: "okta", label: "Okta Workforce Identity" },
                    ]}
                    value={config.providerId}
                    onChange={(val) => setConfig({ ...config, providerId: val as any })}
                  />
                </div>

                <Input
                  label="OAuth Client ID"
                  placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                  value={config.clientId}
                  onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                  required
                />

                <Input
                  label="Issuer URL (OIDC Discovery)"
                  placeholder="https://accounts.google.com"
                  value={config.issuerUrl}
                  onChange={(e) => setConfig({ ...config, issuerUrl: e.target.value })}
                  required
                />

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1 uppercase">
                    Group to Role Mappings (JSON Object)
                  </label>
                  <textarea
                    rows={4}
                    value={config.groupMappingsJson}
                    onChange={(e) => setConfig({ ...config, groupMappingsJson: e.target.value })}
                    className="w-full p-3 font-mono text-xs rounded-md bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-[var(--border)]">
                  <Button type="submit" variant="primary" loading={saving} className="gap-2">
                    <Save className="w-4 h-4" /> Save SSO Configuration
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
