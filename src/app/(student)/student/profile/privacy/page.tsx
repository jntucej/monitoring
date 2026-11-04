"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getAuthHeaders } from "@/lib/utils";

interface ConsentRow {
  scope: string;
  label: string;
  description: string;
  required: boolean;
  version: string;
  granted: boolean;
  grantedAt: string | null;
}

const SCOPES: Record<string, { label: string; description: string; required: boolean }> = {
  core_service: {
    label: "Account and gate access",
    description:
      "Required to operate your account, log gate scans, and manage your identity on campus.",
    required: true,
  },
  guardian_notifications: {
    label: "Guardian notifications (SMS/email)",
    description:
      "Send gate entry, exit, and pass status updates to your registered guardian.",
    required: false,
  },
  biometric_verification: {
    label: "Biometric verification",
    description:
      "Allow fingerprint or face verification at gates. You can always use your ID card instead.",
    required: false,
  },
  mess_service: {
    label: "Mess and meal tracking",
    description: "Track your meal preferences, tokens, and billing.",
    required: false,
  },
  analytics: {
    label: "Anonymous usage analytics",
    description: "Help improve the portal. No data is shared with third parties.",
    required: false,
  },
};

export default function PrivacyPage() {
  const [consents, setConsents] = useState<ConsentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const load = async () => {
    try {
      const res = await fetch("/api/me/consent", { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success) {
        setConsents(json.data.consents as ConsentRow[]);
      } else {
        setError(json.error?.message ?? "Failed to load consent records.");
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (scope: string, currentlyGranted: boolean) => {
    setError(null);
    try {
      const res = await fetch("/api/me/consent", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ scope, granted: !currentlyGranted }),
      });
      const json = await res.json();
      if (json.success) {
        addToast({
          variant: "success",
          title: currentlyGranted ? "Consent withdrawn" : "Consent granted",
          message: `${scope} is now ${currentlyGranted ? "withdrawn" : "active"}.`,
        });
        load();
      } else {
        addToast({ variant: "error", title: "Failed", message: json.error?.message ?? "Could not update consent." });
      }
    } catch {
      addToast({ variant: "error", title: "Network error", message: "Could not reach the server." });
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <ShieldCheck className="w-5 h-5" aria-hidden="true" /> Privacy &amp; Consent
      </h1>
      <p className="text-sm text-[var(--text-muted)]">
        You control how your data is used. Required consents cannot be disabled — they are
        necessary to provide campus services. All others are optional and can be revoked at
        any time.
      </p>

      {error && (
        <Card className="p-4 border-[var(--action-danger)]/30 bg-[var(--action-danger)]/10">
          <p className="text-sm text-[var(--action-danger)]">{error}</p>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading consent records…</p>
      ) : (
        <Card className="divide-y divide-[var(--border)]">
          {Object.entries(SCOPES).map(([scope, meta]) => {
            const c = consents.find((x) => x.scope === scope);
            const isGranted = !!c?.granted;
            const _isKnownScope = SCOPES[scope];
            return (
              <div key={scope} className="p-4 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium">{meta.label}</p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">{meta.description}</p>
                  {meta.required && (
                    <p className="text-xs text-[var(--action-warning)] mt-2">
                      Required — cannot be disabled.
                    </p>
                  )}
                  {isGranted && c?.grantedAt && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Granted {new Date(c.grantedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </p>
                  )}
                </div>
                <Button
                  variant={isGranted ? "secondary" : "primary"}
                  size="sm"
                  disabled={(meta.required && isGranted) || loading}
                  onClick={() => toggle(scope, isGranted)}
                  aria-label={`${isGranted ? "Withdraw" : "Grant"} ${meta.label} consent`}
                >
                  {isGranted ? (
                    <>
                      <X className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Withdraw
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Grant
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </Card>
      )}

      <p className="text-xs text-[var(--text-muted)] space-y-1">
        For questions about how your data is processed, contact the Data Protection Officer
        at <a className="underline" href="mailto:dpo@jntuhcej.ac.in">dpo@jntuhcej.ac.in</a>.
        <br />
        See the{" "}
        <a className="underline" href="/about">
          About
        </a>{" "}
        page for institutional information.
      </p>
    </div>
  );
}
