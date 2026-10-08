import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Copies are made at upload time. No viewing-time transformation of B2.
    unoptimized: true,
    remotePatterns: [],
  },
};

export default nextConfig;
