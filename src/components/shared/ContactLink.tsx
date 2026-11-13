import { Mail, Phone } from "lucide-react";

export interface EmailLinkProps {
  email: string;
  className?: string;
  showIcon?: boolean;
  label?: string;
}

export function EmailLink({ email, className, showIcon = true, label }: EmailLinkProps) {
  const trimmed = email.trim();
  if (!trimmed) return null;
  return (
    <a
      href={`mailto:${trimmed}`}
      aria-label={label ?? `Email ${trimmed}`}
      className={
        className ??
        "inline-flex items-center gap-1 text-action-info underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-info)] rounded"
      }
    >
      {showIcon && <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
      <span className="break-all">{trimmed}</span>
    </a>
  );
}

export interface PhoneLinkProps {
  phone: string;
  className?: string;
  showIcon?: boolean;
  label?: string;
}

export function PhoneLink({ phone, className, showIcon = true, label }: PhoneLinkProps) {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const tel = trimmed.replace(/[^\d+]/g, "");
  return (
    <a
      href={`tel:${tel}`}
      aria-label={label ?? `Call ${trimmed}`}
      className={
        className ??
        "inline-flex items-center gap-1 text-action-info underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-info)] rounded"
      }
    >
      {showIcon && <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
      <span>{trimmed}</span>
    </a>
  );
}
