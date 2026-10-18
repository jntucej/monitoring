"use client";

import { LoginBubble, type BubbleTone } from "./LoginBubble";

interface BubbleSpec {
  label: string;
  sublabel?: string;
  accent: string;
  size: number;
  href: string;
  tone?: BubbleTone;
}

/**
 * ONE primary door: Sign In → /login (real role routing happens after auth).
 * Secondary bubbles are optional — add a line, get a bubble.
 */
const PRIMARY: BubbleSpec = {
  label: "Sign In",
  sublabel: "enter the campus",
  accent: "#67e8f9",
  size: 168,
  href: "/login",
};

const SECONDARY: BubbleSpec[] = [
  { label: "Help",    sublabel: "how it works", accent: "#94a3b8", size: 104, href: "/help",    tone: "ghost" },
  { label: "About",   sublabel: "the campus",   accent: "#94a3b8", size:  96, href: "/about",   tone: "ghost" },
  { label: "Support", sublabel: "reach us",     accent: "#94a3b8", size:  96, href: "/support", tone: "ghost" },
];

export function LoginBubbleField() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-14">
      {/* The one door */}
      <LoginBubble
        label={PRIMARY.label}
        sublabel={PRIMARY.sublabel}
        accent={PRIMARY.accent}
        size={PRIMARY.size}
        href={PRIMARY.href}
        seed={0}
      />
      {/* Optional doors — silently absent when the array is empty */}
      {SECONDARY.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
          {SECONDARY.map((b, i) => (
            <LoginBubble
              key={b.label}
              label={b.label}
              sublabel={b.sublabel}
              accent={b.accent}
              size={b.size}
              href={b.href}
              tone={b.tone}
              seed={i + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
