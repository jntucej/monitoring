import type { MetadataRoute } from "next";

const BASE = "https://monitor.cej.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: `${BASE}/about`,
      lastModified,
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${BASE}/login`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ];
}
