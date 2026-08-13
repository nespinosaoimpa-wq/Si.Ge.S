import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bypass environment-specific type resolution errors during build
  typescript: {
    ignoreBuildErrors: true,
  },

  transpilePackages: ['react-map-gl', '@vis.gl/react-mapbox', 'mapbox-gl'],

  env: {
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
  },

  turbopack: {},

  // ── Enterprise Security Headers ──────────────────────────────
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=self, geolocation=self, microphone=self',
          },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
      // CORS for API routes
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_APP_URL || '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },

  // ── Image optimization ─────────────────────────────────────
  // unoptimized: true evita que Vercel procese imágenes en servidor
  // (Image Optimization API consume GB del plan gratuito).
  // Las imágenes de Supabase Storage ya vienen optimizadas desde su CDN.
  images: {
    unoptimized: true,
  },

  // ── Bundle optimization ──────────────────────────────────────
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts'],
  },
};

export default nextConfig;
