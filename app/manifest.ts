import type { MetadataRoute } from 'next';

/**
 * PWA web app manifest. Served at /manifest.webmanifest and referenced from the
 * root layout metadata. Makes Bingeprint installable with a standalone,
 * app-like shell on mobile and desktop.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bingeprint',
    short_name: 'Bingeprint',
    description:
      'Your personal TV tracking and discovery app. Know your television taste better than any streaming service.',
    id: '/',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a0b',
    theme_color: '#0a0a0b',
    categories: ['entertainment', 'lifestyle', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
