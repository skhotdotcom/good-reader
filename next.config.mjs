/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent webpack from bundling heavy server-only modules
  serverExternalPackages: ['better-sqlite3', 'jsdom'],
  // Allow Electron dev mode to load /_next/* resources from 127.0.0.1
  allowedDevOrigins: ['127.0.0.1'],
  experimental: {
    // Limit build workers to avoid OOM during page data collection
    cpus: 2,
  },
};

export default nextConfig;
