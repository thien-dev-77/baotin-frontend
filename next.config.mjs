import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: root,
  turbopack: { root },
  images: { qualities: [75, 85, 90], minimumCacheTTL: 3600 },
  distDir: process.env.NEXT_DIST_DIR || ".next"
};

export default nextConfig;
