"use client";

import { useEffect, useState } from "react";
import { CHAPTERS, type ChapterId, type ChapterAccent } from "../story/data";

const ACCENT_VAR: Record<ChapterAccent, string> = {
  amber: "var(--home-accent-amber)",
  indigo: "var(--home-accent-indigo)",
  steel: "var(--home-accent-steel)",
  crimson: "var(--home-accent-crimson)",
  navy: "var(--home-accent-navy)",
};

const GLOW_POS: Record<ChapterAccent, { x: string; y: string }> = {
  amber: { x: "30%", y: "40%" },
  indigo: { x: "70%", y: "30%" },
  steel: { x: "40%", y: "50%" },
  crimson: { x: "50%", y: "25%" },
  navy: { x: "20%", y: "30%" },
};

export function useChapterTracker(): ChapterId {
  const [activeId, setActiveId] = useState<ChapterId>("leave");

  useEffect(() => {
    const sections = CHAPTERS
      .map((c) => document.getElementById(`chapter-${c.id}`))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (!visible.length) return;
        const id = visible[0].target.getAttribute("data-chapter") as ChapterId | null;
        if (!id) return;

        setActiveId(id);
        const chapter = CHAPTERS.find((c) => c.id === id);
        const homeEl = document.querySelector<HTMLElement>("[data-home]");

        if (chapter && homeEl) {
          homeEl.style.setProperty("--home-active-accent", ACCENT_VAR[chapter.accent]);
          homeEl.style.setProperty("--home-active-glow-x", GLOW_POS[chapter.accent].x);
          homeEl.style.setProperty("--home-active-glow-y", GLOW_POS[chapter.accent].y);
        }
      },
      { threshold: [0.35, 0.5, 0.65, 0.85] }
    );

    sections.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return activeId;
}
