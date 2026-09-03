import type { NextConfig } from "next";

const DEFAULT_SUPABASE_URL = 'https://xgzkudwuukctaldwcekr.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_aFoFA_XdCWTUu-fOLPudmQ_UhT3KO1Q';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true, // Bypasses Vercel image optimization proxy (0 KB Vercel image egress)
  },
  transpilePackages: ['react-map-gl', '@vis.gl/react-mapbox', 'mapbox-gl'],
  env: {
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || process.env.TOKEN_DE_ACCESO_A_MAPA_PÚBLICO_SIGUIENTE || '',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SIGUIENTE_URL_SUPABASE_PÚBLICA || DEFAULT_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY,
  },
  async headers() {
    return [
      {
        source: '/:path*.(png|jpg|jpeg|gif|webp|svg|ico|mp3|wav|ogg|ttf|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
  turbopack: {},
};

export default nextConfig;
