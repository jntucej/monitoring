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
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
    categories: ["education", "productivity"],
  };
}
