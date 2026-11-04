/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  instrumentation: () => import("./src/instrumentation"),
  reactStrictMode: true,
  compress: true,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "date-fns",
      "@simplewebauthn/browser",
      "qrcode.react",
      "react-qrcode-logo",
      "remotion",
      "@remotion/player",
    ],
  },
  transpilePackages: [
    "ai-scheduler-kit",
    "human-pulse-kit",
    "sysadmin-console-kit",
    "admin-console-kit",
  ],
  output: "standalone",
  serverExternalPackages: ["bcryptjs", "pg"],
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 86400,
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.monitor.ucej.in" }],
        destination: "https://monitor.ucej.in/:path*",
        permanent: true,
      },
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
      // Parent console is consolidated into the guardian portal (single source
      // of truth). The /parent/* slugs still redirect so deep links work.
      {
        source: "/parent/:path*",
        destination: "/guardian/:path*",
        permanent: true,
      },
      {
        source: "/parent",
        destination: "/guardian",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
          // L2: CSP is set per-request by the edge middleware (src/middleware.ts),
          // which stamps a per-request nonce so 'strict-dynamic' can unlock
          // dynamically-imported chunks without 'unsafe-inline'. A static CSP
          // header here would arrive alongside the middleware's nonce-bearing
          // header; the browser enforces the UNION of both, and the nonce-less
          // static policy's 'strict-dynamic' without a matching nonce blocks
          // every chunk load. The middleware is the single CSP source of
          // truth — do not add a second static CSP header here.
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/opengraph-image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=604800",
          },
        ],
      },
      {
        source: "/icon",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, s-maxage=604800" },
        ],
      },
    ];
  },
};

export default nextConfig;