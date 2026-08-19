import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow server-only Prisma in API routes
  serverExternalPackages: ["@prisma/client", "prisma"],
  // Clean URLs
  trailingSlash: false,
  // Optimize images
  images: {
    formats: ["image/webp"],
  },
};

export default nextConfig;
