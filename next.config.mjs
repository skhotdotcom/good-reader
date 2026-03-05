/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Turbopack/webpack from bundling native Node addons
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
