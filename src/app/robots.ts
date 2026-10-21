import type { MetadataRoute } from "next";
import { COLLEGE } from "@/lib/college-config";

/**
 * Generated /robots.txt.
 *
 * The role consoles (/admin, /sysadmin, /student, /operator, ...) must NOT
 * be enumerated here — a Disallow list of them is a public map of every
 * privileged path on the domain. So: disallow everything, then allow only
 * the genuinely public, indexable pages (the sitemap set) plus the asset
 * files a crawler needs. This kills both the "role enumeration" and
 * "wrong sitemap domain" findings from the recon report.
 */
export default function robots(): MetadataRoute.Robots {
  const allow = [
    "/$",
    "/about",
    "/help",
    "/support",
    "/login",
    "/sitemap.xml",
    "/manifest.webmanifest",
    "/icon",
    "/robots.txt",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        // allow wins over the disallow within the same rule, so the public
        // pages are indexable while every role console stays out of search.
        allow,
        disallow: ["/"],
      },
    ],
    sitemap: `${COLLEGE.baseUrl}/sitemap.xml`,
  };
}
