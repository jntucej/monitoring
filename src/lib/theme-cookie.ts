import { cookies } from "next/headers";

export type Theme = "dark" | "light" | "glass";

export async function getServerTheme(): Promise<Theme> {
  const store = await cookies();
  const t = store.get("gate-monitor-theme")?.value;
  if (t === "light" || t === "glass" || t === "dark") return t;
  return "dark";
}
