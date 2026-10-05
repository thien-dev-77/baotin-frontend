/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async rewrites() {
    const backend = process.env.BACKEND_URL || "http://127.0.0.1:4000";
    return [
      { source: "/api/backend/:path*", destination: `${backend}/api/:path*` },
      { source: "/images/:path*", destination: `${backend}/media/images/:path*` },
      { source: "/media/:path*", destination: `${backend}/media/:path*` }
    ];
  }
};

export default nextConfig;
