"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Perspective = "student" | "parent" | "guard" | "warden" | "admin";

interface PerspectiveState {
  perspective: Perspective;
  setPerspective: (p: Perspective) => void;
}

export const usePerspective = create<PerspectiveState>()(
  persist(
    (set) => ({
      perspective: "student",
      setPerspective: (p) => set({ perspective: p }),
    }),
    {
      name: "home-perspective",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
