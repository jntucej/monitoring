"use client";

import { useEffect, useState } from "react";

const BOOT_KEY = "campus-booted";
const MIN_BOOT_MS = 900;

export function useBootSequence() {
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(BOOT_KEY) === "1") {
      setBooted(true);
      return;
    }

    const t = setTimeout(() => {
      setBooted(true);
      sessionStorage.setItem(BOOT_KEY, "1");
    }, MIN_BOOT_MS);

    return () => clearTimeout(t);
  }, []);

  return booted;
}
