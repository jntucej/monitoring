const isDockerBuild = process.env.DOCKER_BUILD === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  typescript: {
    // Keep strict -- do NOT set to true, it hides real bugs.
    ignoreBuildErrors: false,
  },
  serverExternalPackages: ['bcryptjs', 'jose', 'pg', 'pg-connection-string', 'pgpass'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }];
  },
  async redirects() {
    return [
      // Legacy alias paths → the single approvals page. These source paths
      // are NOT real pages on disk (they're old route names), so the redirect
      // is safe: the destination path (/principal/approvals) is a real page and
      // the source path differs from the destination path, so no 307 loop.
      { source: '/principal/permissions',            destination: '/principal/approvals?tab=mine',      permanent: false },
      { source: '/principal/all-pass-requests',      destination: '/principal/approvals?tab=all',       permanent: false },
      { source: '/principal/permission-management',  destination: '/principal/approvals?tab=all',       permanent: false },
      { source: '/principal/approval-centre',        destination: '/principal/approvals?tab=escalated', permanent: false },

      // Legacy alias: department-analytics page existed on disk but was
      // superseded by the departments page. Safe redirect (different path).
      { source: '/principal/department-analytics',   destination: '/principal/departments',              permanent: false },

      // Existing profile redirects
      { source: '/admin/profile',      destination: '/profile', permanent: false },
      { source: '/principal/profile',  destination: '/profile', permanent: false },
      { source: '/hod/profile',        destination: '/profile', permanent: false },
      { source: '/exam/profile',       destination: '/profile', permanent: false },
      { source: '/hostel/profile',     destination: '/profile', permanent: false },
      { source: '/staff/profile',      destination: '/profile', permanent: false },
      { source: '/faculty/profile',    destination: '/profile', permanent: false },
      { source: '/parent/profile',     destination: '/profile', permanent: false },
      { source: '/supervisor/profile', destination: '/profile', permanent: false },
      { source: '/warden/profile',     destination: '/profile', permanent: false },
      { source: '/visitor/profile',    destination: '/profile', permanent: false },
      { source: '/worker/profile',     destination: '/profile', permanent: false },
      { source: '/operator/profile',   destination: '/profile', permanent: false },
    ];
  },
};

export default nextConfig;
