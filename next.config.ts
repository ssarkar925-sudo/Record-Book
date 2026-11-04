import type { NextConfig } from 'next';

const isVercel = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  ...(isVercel ? {} : { output: 'export' }),
  images: {
    unoptimized: true,
  },
  reactStrictMode: false,
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'xlsx'],
  },
};

export default nextConfig;
