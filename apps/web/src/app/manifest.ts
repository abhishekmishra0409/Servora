import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: '#fbf7f1',
    description: 'Restaurant operations and QR table ordering.',
    display: 'standalone',
    icons: [
      { sizes: '192x192', src: '/icons/icon-192.png', type: 'image/png' },
      { sizes: '512x512', src: '/icons/icon-512.png', type: 'image/png' },
      { purpose: 'maskable', sizes: '512x512', src: '/icons/icon-maskable-512.png', type: 'image/png' },
    ],
    id: '/',
    name: 'Servora',
    short_name: 'Servora',
    start_url: '/',
    theme_color: '#b84a2b',
  };
}
