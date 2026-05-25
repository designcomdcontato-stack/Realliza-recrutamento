/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Avoid ESLint 9 environment and configuration parser errors from blocking Vercel builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
