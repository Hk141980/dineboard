/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  swcMinify: true,
  poweredByHeader: false,
  // Skip TypeScript and ESLint errors during production build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  },
  images: {
    domains: ['localhost', 'dineboard.in', 'dxxxxxxxxx.cloudfront.net'],
    formats: ['image/avif', 'image/webp'],
  },
  async rewrites() {
    // API backend URL: inside Docker it's 'api:4000', outside it's 'localhost:4000'
    const apiUrl = process.env.BACKEND_URL || 'http://api:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${apiUrl}/uploads/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
