import type { MetadataRoute } from "next";
import { COLLEGE } from "@/lib/college-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${COLLEGE.officialName} Campus Portal`,
    short_name: COLLEGE.shortName,
    description: COLLEGE.portalPurpose,
    start_url: "/",
    display: "standalone",
    background_color: "var(--bg-base)",
    theme_color: "var(--action-success)",
    orientation: "portrait-primary",
    lang: "en-IN",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/icon", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "192x192", type: "image/png", purpose: "maskable" },
    ],
    categories: ["education", "productivity"],
  };
}
