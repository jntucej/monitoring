"use client";

// M1 — Reusable step-up re-authentication modal. Opened when the server
// returns 401 + code STEP_UP_REQUIRED. On success the caller retries the
// original request (the step-up marker is fresh for 5 minutes).
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function StepUpModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/step-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(j?.error?.message ?? "Incorrect password");
        return;
      }
      setPassword("");
      onSuccess();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Confirm your password">
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-secondary">
          This action requires a fresh password confirmation (valid for 5
          minutes).
        </p>
        <Input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          label="Password"
          error={error ?? undefined}
        />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Confirm
          </Button>
        </div>
      </form>
    </Modal>
  );
}
