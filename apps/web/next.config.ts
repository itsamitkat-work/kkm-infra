import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ["@kkm/shared", "@kkm/db"],
  images: {
    domains: [], // Add any external image domains if needed
  },
};

export default nextConfig;
