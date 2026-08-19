import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow server-only Prisma in API routes
  serverExternalPackages: ["@prisma/client", "prisma"],
  // Allow local mobile phone devices on LAN to access dev resources without CORS block
  allowedDevOrigins: ["192.168.1.92", "localhost", "127.0.0.1", "10.0.2.2"],
  // Clean URLs
  trailingSlash: false,
  // Optimize images
  images: {
    unoptimized: true,
    formats: ["image/webp"],
  },
};

export default nextConfig;
