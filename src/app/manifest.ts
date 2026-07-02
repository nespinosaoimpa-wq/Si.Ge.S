import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SIGPAD',
    short_name: 'SIGPAD',
    description: 'SIGPAD • Sistema Inteligente de Gestión',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#111111',
    theme_color: '#111111',
    categories: ['business', 'security'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/maskable-icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
