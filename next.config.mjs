import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Chat preview clients must receive product metadata in the initial <head>.
  htmlLimitedBots: /.*/,
  outputFileTracingRoot: root,
  turbopack: { root },
  // Shared hosting may expose more CPUs than its process/thread quota allows.
  experimental: { cpus: 1, workerThreads: false },
  images: { qualities: [75, 85, 90], minimumCacheTTL: 3600 },
  distDir: process.env.NEXT_DIST_DIR || ".next"
};

export default nextConfig;
