"use client";

import { useMemo } from "react";

export type AtmosphereVariant =
  | "campus"
  | "inbox"
  | "study"
  | "resources"
  | "vault"
  | "pulse"
  | "profile"
  | "legal";

export interface AtmosphereMicrocopy {
  hero: string;
  subhero: string;
  empty: string;
  loading: string;
  footer: string;
}

export interface AtmosphereTokens {
  variant: AtmosphereVariant;
  accent: string;
  glow: string;
  vignette: string;
  microcopy: AtmosphereMicrocopy;
}

function make(
  variant: AtmosphereVariant,
  accent: string,
  glow: string,
  microcopy: AtmosphereMicrocopy,
): AtmosphereTokens {
  return {
    variant,
    accent,
    glow,
    vignette:
      `radial-gradient(ellipse at 50% 0%, ${accent}14, transparent 55%),` +
      `radial-gradient(ellipse at 50% 100%, ${glow}, transparent 60%)`,
    microcopy,
  };
}

const TOKENS: Record<AtmosphereVariant, AtmosphereTokens> = {
  campus: make("campus", "#67e8f9", "rgba(139,92,246,0.15)", {
    hero: "Every gate remembers everyone who passed.",
    subhero: "The campus breathes. We listen.",
    empty: "Silence settles over the atmosphere.",
    loading: "Listening for the first signal of the night…",
    footer: "A quiet instrument for a loud campus.",
  }),
  inbox: make("inbox", "#a5b4fc", "rgba(99,102,241,0.15)", {
    hero: "Quiet traces arrive while you sleep.",
    subhero: "The queue waits. It is patient.",
    empty: "Nothing needs you right now.",
    loading: "Receiving the first trace…",
    footer: "Every message finds its keeper.",
  }),
  study: make("study", "#f59e0b", "rgba(245,158,11,0.12)", {
    hero: "A late-night library, amber light.",
    subhero: "Chapter after chapter, the night deepens.",
    empty: "The shelf is empty for now.",
    loading: "Opening the shelf…",
    footer: "Read slowly. Remember slowly.",
  }),
  resources: make("resources", "#fbbf24", "rgba(251,191,36,0.12)", {
    hero: "A vault of forgotten books.",
    subhero: "Every shelf holds something older.",
    empty: "This shelf is quiet tonight.",
    loading: "Opening the archive…",
    footer: "What is kept, is kept gently.",
  }),
  vault: make("vault", "#f9a8d4", "rgba(244,114,182,0.12)", {
    hero: "The memory cabinet.",
    subhero: "Things kept safe, out of sight.",
    empty: "The cabinet is closed for now.",
    loading: "Unlocking the cabinet…",
    footer: "Some things are not for forgetting.",
  }),
  pulse: make("pulse", "#22d3ee", "rgba(139,92,246,0.18)", {
    hero: "The mood of the whole campus.",
    subhero: "Cyan sky. Violet night. Both true.",
    empty: "The campus is still.",
    loading: "Measuring the pulse…",
    footer: "Watch the weather, not the clock.",
  }),
  profile: make("profile", "#c4b5fd", "rgba(139,92,246,0.14)", {
    hero: "One person's emotional presence.",
    subhero: "An aura, not a dossier.",
    empty: "Nothing to show yet.",
    loading: "Reading the aura…",
    footer: "You are more than your record.",
  }),
  legal: make("legal", "#e7e5e4", "rgba(231,229,228,0.08)", {
    hero: "Quiet honesty, no drama.",
    subhero: "The plain words, said plainly.",
    empty: "Nothing to see here.",
    loading: "Opening the page…",
    footer: "Read it. It is short.",
  }),
};

export function useAtmosphereTheme(
  variant: AtmosphereVariant = "campus",
): AtmosphereTokens {
  return useMemo(() => TOKENS[variant], [variant]);
}
