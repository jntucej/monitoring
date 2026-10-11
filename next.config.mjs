const isDockerBuild = process.env.DOCKER_BUILD === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  typescript: {
    // Keep strict -- do NOT set to true, it hides real bugs.
    ignoreBuildErrors: false,
  },
  serverExternalPackages: ['bcryptjs', 'jose'],
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
