import type { MetadataRoute } from "next";
import { COLLEGE } from "@/lib/college-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = COLLEGE.baseUrl;
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/help`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
  ];
}
