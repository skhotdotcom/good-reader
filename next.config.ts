import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // All pages are dynamic since this is a local-first app using SQLite
  output: 'standalone',
};

export default nextConfig;
