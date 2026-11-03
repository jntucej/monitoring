"use client";
// M3 — Live password rule checklist. Pass the target user's role and the
// in-progress password; renders which role-specific rules pass or fail.
import { policyFor } from "@/lib/password-policy";

export function PasswordRules({
  role,
  password,
  context,
}: {
  role: string;
  password: string;
  context?: { email?: string; name?: string };
}) {
  const p = policyFor(role);

  const rules: { label: string; ok: boolean }[] = [
    { label: `At least ${p.minLength} characters`, ok: password.length >= p.minLength },
    { label: "An uppercase letter", ok: !p.requireUpper || /[A-Z]/.test(password) },
    { label: "A lowercase letter", ok: !p.requireLower || /[a-z]/.test(password) },
    { label: "A digit", ok: !p.requireDigit || /[0-9]/.test(password) },
    { label: "A symbol", ok: !p.requireSpecial || /[^A-Za-z0-9]/.test(password) },
  ];

  // Blocklist / PII checks (mirrors server-side validatePassword).
  if (password) {
    const lower = password.toLowerCase();
    if (context?.email) {
      const local = context.email.split("@")[0].toLowerCase();
      if (local.length >= 4 && lower.includes(local)) {
        rules.push({ label: "Must not contain your email", ok: false });
      }
    }
    if (context?.name) {
      for (const token of context.name.toLowerCase().split(/\s+/)) {
        if (token.length >= 4 && lower.includes(token)) {
          rules.push({ label: "Must not contain your name", ok: false });
          break;
        }
      }
    }
  }

  return (
    <ul className="mt-2 space-y-1 text-xs">
      {rules.map((r) => (
        <li
          key={r.label}
          className={
            "flex items-center gap-1 " +
            (r.ok ? "text-emerald-400" : "text-rose-400")
          }
        >
          <span aria-hidden>{r.ok ? "✓" : "✗"}</span>
          {r.label}
        </li>
      ))}
    </ul>
  );
}
