import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const allowedOrigin =
  process.env.ALLOWED_ORIGIN ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  (isProd ? "" : "*");

const corsHeaderOrigin = allowedOrigin || (isProd ? "self" : "*");

if (isProd && !process.env.ALLOWED_ORIGIN && !process.env.NEXT_PUBLIC_APP_URL && !process.env.VERCEL_URL) {
  console.warn(
    "[CORS WARNING] ALLOWED_ORIGIN environment variable is not explicitly set in production. Restricting Access-Control-Allow-Origin to 'self'."
  );
}

const nextConfig: NextConfig = {
  // Configure webpack to handle native modules
  webpack: (config, { isServer }) => {
    if (isServer) {
      // On server side, we can use native modules
      config.resolve.alias = {
        ...config.resolve.alias,
        better_sqlite3: false,
      };
    }
    // On client side, API routes will handle DB operations
    return config;
  },
  turbopack: {},
  // Security headers & CORS rules (Phase 6 hardening)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: corsHeaderOrigin },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-user-id, x-user-role, x-operator-id" },
        ],
      },
    ];
  },
};

export default nextConfig;
