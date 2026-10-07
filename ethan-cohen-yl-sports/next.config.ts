import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Photos live in Backblaze B2 and are fetched by the Vercel image optimizer.
    remotePatterns: [
      { protocol: "https", hostname: "*.backblazeb2.com" },
    ],
    // Photo files are immutable (UUID filenames), so cache optimized copies for a year.
    // This is what keeps B2 download usage low: each size is fetched from B2 once,
    // then served from Vercel's CDN cache to every visitor.
    minimumCacheTTL: 31536000,
    // Keep the set of generated sizes small so each photo is only pulled from B2 a few times.
    // 640  → phones at 1x, desktop grid tiles at 1x
    // 1200 → phones at 2-3x, desktop grid tiles at 2x
    // 2048 → lightbox on large / retina screens
    deviceSizes: [640, 1200, 2048],
    imageSizes: [256, 384],
    qualities: [75, 85],
  },
};

export default nextConfig;
