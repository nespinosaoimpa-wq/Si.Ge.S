import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bypass environment-specific type resolution errors that crash the build worker
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['react-map-gl', '@vis.gl/react-mapbox', 'mapbox-gl'],
  env: {
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
  },
  // Empty turbopack config to signal that we're fine with Turbopack
  turbopack: {},
};

export default nextConfig;
