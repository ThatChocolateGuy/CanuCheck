import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  experimental: {
    optimisticClientCache: true,
  }
};

export default nextConfig;
