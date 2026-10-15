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
      // Collapse 5 approval pages → 1
      { source: '/principal/approvals',              destination: '/principal/approvals?tab=mine',      permanent: false },
      { source: '/principal/permissions',            destination: '/principal/approvals?tab=mine',      permanent: false },
      { source: '/principal/all-pass-requests',      destination: '/principal/approvals?tab=all',       permanent: false },
      { source: '/principal/permission-management',  destination: '/principal/approvals?tab=all',       permanent: false },
      { source: '/principal/approval-centre',        destination: '/principal/approvals?tab=escalated', permanent: false },

      // Oversight (audit + incidents merged)
      { source: '/principal/audit',                  destination: '/principal/oversight?tab=audit',      permanent: false },
      { source: '/principal/incidents',              destination: '/principal/oversight?tab=incidents',  permanent: false },

      // Campus (attendance + hostel + gates + exams)
      { source: '/principal/attendance',             destination: '/principal/campus?tab=people',        permanent: false },
      { source: '/principal/hostel-oversight',       destination: '/principal/campus?tab=places',        permanent: false },
      { source: '/principal/gate-activity',          destination: '/principal/campus?tab=places',        permanent: false },
      { source: '/principal/examination-oversight',  destination: '/principal/campus?tab=exams',         permanent: false },

      // Departments
      { source: '/principal/department-analytics',   destination: '/principal/departments',              permanent: false },

      // Drawers
      { source: '/principal/delegation-manager',     destination: '/principal/approvals?action=delegate', permanent: false },
      { source: '/principal/emergency-decisions',    destination: '/principal?playbook=1',                permanent: false },

      // Reports → Command Center export
      { source: '/principal/reports',                destination: '/principal?action=export',            permanent: false },

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
