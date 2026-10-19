"use client";

import { useEffect, useState } from "react";
import { SCENES, type SceneId, type SceneAccent } from "../story/scenes/scenesData";

const ACCENT_VAR: Record<SceneAccent, string> = {
  amber:   "var(--home-accent-amber)",
  emerald: "var(--home-accent-navy)",
  steel:   "var(--home-accent-steel)",
  crimson: "var(--home-accent-crimson)",
  violet:  "var(--home-accent-indigo)",
};

const GLOW_POS: Record<SceneAccent, { x: string; y: string }> = {
  amber:   { x: "30%", y: "40%" },
  emerald: { x: "60%", y: "30%" },
  steel:   { x: "40%", y: "50%" },
  crimson: { x: "50%", y: "25%" },
  violet:  { x: "70%", y: "40%" },
};

export function useSceneTracker(): SceneId {
  const [activeId, setActiveId] = useState<SceneId>("request");

  useEffect(() => {
    const sections = SCENES.map((s) =>
      document.getElementById(`scene-${s.id}`)
    ).filter((el): el is HTMLElement => Boolean(el));

    if (!sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (!visible.length) return;
        const id = visible[0].target.getAttribute("data-scene") as SceneId | null;
        if (!id) return;

        setActiveId(id);
        const scene = SCENES.find((s) => s.id === id);
        const homeEl = document.querySelector<HTMLElement>("[data-home]");
        if (scene && homeEl) {
          homeEl.style.setProperty("--home-active-accent", ACCENT_VAR[scene.accent]);
          homeEl.style.setProperty("--home-active-glow-x", GLOW_POS[scene.accent].x);
          homeEl.style.setProperty("--home-active-glow-y", GLOW_POS[scene.accent].y);
        }
      },
      { threshold: [0.35, 0.5, 0.65, 0.85] }
    );

    sections.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return activeId;
}
