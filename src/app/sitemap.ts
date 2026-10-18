import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://monitor.cej.in";
  const now = new Date();
  return [
    { url: `${base}/`,       lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/login`,  lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/about`,  lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/help`,   lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/support`,lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
