"use client";

import { useEffect, useState } from "react";

const KEY = "home-visited";

export function useReturningVisitor(): boolean {
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    const visited = localStorage.getItem(KEY);
    if (visited === "1") setReturning(true);
    else localStorage.setItem(KEY, "1");
  }, []);

  return returning;
}
