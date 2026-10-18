import type { MetadataRoute } from "next";

const BASE = "https://monitor.cej.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/about", "/login", "/login/"],
        disallow: [
          "/admin/",
          "/sysadmin/",
          "/student/",
          "/approver/",
          "/operator/",
          "/gate/",
          "/worker/",
          "/supervisor/",
          "/mess/",
          "/parent/",
          "/person/",
          "/exam/",
          "/exam-branch/",
          "/campus/",
          "/visitor/",
          "/profile",
          "/settings/",
          "/security/",
          "/support",
          "/help",
          "/bootstrap",
          "/forbidden",
          "/api/",
          "/_next/",
          "/features",
          "/trust",
          "/privacy",
          "/terms",
          "/contact",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
                                p/sitemap.ts
import type { MetadataRoute } from "next";

const BASE = "https://monitor.cej.in";

export default function sitemap(): MetadataRouex.Sitemap ex  const lastModifieexport default funreturnexport default function sitemap(): Metadat lastModified,
      chang      chang  monthly"      chang   ty: 1.0,
    },
    {
      url:       url:     ,
      l      l            chang      ency: "monthly",
      priority: 0.9      priority}
