"use client";

/**
 * SmartTextRef — turns reference tokens in free text into role-aware links.
 *
 * Recognized token patterns:
 *   PASS-NNN / TKT-NNN   → ticket entity
 *   CMP-NNN / ISS-NNN   → complaint entity
 *   GATE-NNN            → gate entity
 *   [roll]              → student entity (e.g. "25JJ5A1203")
 *
 * For each match, if the active user's role can inspect that entity kind,
 * a `<Link>` is rendered pointing to ?inspect=kind:id (preserving list state
 * when already on a list page) or a dedicated detail route for self-owned records.
 * When the user lacks permission, the token renders as plain monospace text
 * (never a broken link).
 */

import React from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import {
  canInspectEntity,
  type EntityKind,
} from "@/lib/entity-access";

export interface RefTokenMatch {
  kind: EntityKind;
  id: string;
  label: string;
}

/**
 * Decide where a token should navigate for the active user.
 * Returns null when the role cannot access this entity kind.
 */
export function resolveTokenHref(
  role: string | undefined,
  kind: EntityKind,
  id: string,
  currentPath: string,
): string | null {
  if (!role) return null;
  if (!canInspectEntity(role, kind)) return null;

  // Self-service: students and guardians link directly to their own pages
  const lowerRole = role.toLowerCase();
  if (lowerRole === "student" && kind === "ticket") {
    return `/student/passes/${encodeURIComponent(id)}`;
  }
  if (
    (lowerRole === "guardian" || lowerRole === "parent") &&
    kind === "ticket"
  ) {
    return `/guardian/child-requests`;
  }

  // General case: append ?inspect=kind:id so list-page context is preserved
  const sep = currentPath.includes("?") ? "&" : "?";
  return `${currentPath}${sep}inspect=${encodeURIComponent(`${kind}:${id}`)}`;
}

/**
 * Regex matching known reference tokens in any UI text.
 * Groups by prefix to keep captures simple.
 */
const TICKET_RE = /\b((?:PASS|TKT)-[A-Z0-9_-]+)\b/gi;
const COMPLAINT_RE = /\b((?:CMP|ISS)-[A-Z0-9_-]+)\b/gi;
const GATE_RE = /\b((?:GATE)-[A-Z0-9_-]+)\b/gi;
// Student roll pattern: 4-char year + alpha block + 6 alphanum
const ROLL_RE = /\b(\d{2}[A-Z]{2}\d{5}[A-Z0-9]{1})\b/gi;

type TokenPart =
  | { type: "text"; value: string }
  | { type: "ticket"; value: string }
  | { type: "complaint"; value: string }
  | { type: "gate"; value: string }
  | { type: "roll"; value: string };

function tokenize(text: string): TokenPart[] {
  const parts: TokenPart[] = [];
  // Merge all regex matches with their positions
  const candidates: Array<{
    type: TokenPart["type"];
    start: number;
    end: number;
    value: string;
  }> = [];

  for (const m of text.matchAll(TICKET_RE)) {
    candidates.push({ type: "ticket", start: m.index!, end: m.index! + m[0].length, value: m[0] });
  }
  for (const m of text.matchAll(COMPLAINT_RE)) {
    candidates.push({ type: "complaint", start: m.index!, end: m.index! + m[0].length, value: m[0] });
  }
  for (const m of text.matchAll(GATE_RE)) {
    candidates.push({ type: "gate", start: m.index!, end: m.index! + m[0].length, value: m[0] });
  }
  for (const m of text.matchAll(ROLL_RE)) {
    candidates.push({ type: "roll", start: m.index!, end: m.index! + m[0].length, value: m[0] });
  }

  candidates.sort((a, b) => a.start - b.start);

  let pos = 0;
  for (const c of candidates) {
    if (c.start > pos) {
      parts.push({ type: "text", value: text.slice(pos, c.start) });
    }
    parts.push({ type: c.type, value: c.value });
    pos = c.end;
  }
  if (pos < text.length) {
    parts.push({ type: "text", value: text.slice(pos) });
  }
  return parts;
}

export function SmartTextRef({
  text,
  currentPath = "",
}: {
  text: string;
  currentPath?: string;
}) {
  const role = useAuthStore((s) => s.user?.role);
  const rawParts = tokenize(text);
  const parts = rawParts.filter(
    (p) => p.type !== "text" || p.value.trim().length > 0,
  );

  if (parts.length === 0 || !text.trim()) {
    return <>{text}</>;
  }

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <React.Fragment key={index}>{part.value}</React.Fragment>;
        }

        let kind: EntityKind | null = null;
        if (part.type === "ticket") kind = "ticket";
        else if (part.type === "complaint") kind = "complaint";
        else if (part.type === "gate") kind = "gate";
        else if (part.type === "roll") kind = "student";

        if (!kind) {
          return (
            <span key={index} className="font-mono font-medium text-foreground/90">
              {part.value}
            </span>
          );
        }

        const href = resolveTokenHref(role, kind, part.value, currentPath);
        if (!href) {
          return (
            <span
              key={index}
              className="font-mono font-medium text-foreground/70 italic"
            >
              {part.value}
            </span>
          );
        }

        return (
          <Link
            key={index}
            href={href}
            scroll={false}
            className="inline-flex items-center rounded bg-primary/10 px-1 py-0.5 font-mono text-xs font-medium text-primary hover:bg-primary/20 hover:underline transition-colors"
          >
            {part.value}
          </Link>
        );
      })}
    </>
  );
}
