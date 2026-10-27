"use client";

import { useEffect, useState } from "react";

export interface TimeGreeting {
  label: string;
  sub: string;
}

export function useTimeGreeting(): TimeGreeting {
  const [h, setH] = useState<number>(() => new Date().getHours());

  useEffect(() => {
    const id = setInterval(() => setH(new Date().getHours()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (h >= 5 && h < 11)
    return { label: "Morning shift begins", sub: "The gates open one by one." };
  if (h >= 11 && h < 17)
    return { label: "The campus is awake", sub: "Footsteps between classes." };
  if (h >= 17 && h < 21)
    return { label: "Evening settles", sub: "The last lectures end." };
  return { label: "The campus is asleep", sub: "The night listens." };
}
