import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force stable Webpack build (NO Turbopack)
  experimental: {},

  // Required for OpenNext on Cloudflare
  output: "standalone",

  // Disable asset prefixing weirdness
  assetPrefix: "",

  // Disable image optimization (Cloudflare-compatible)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
