import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: ["pdf-parse"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
