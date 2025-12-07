import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/lyttejeger/',
  server: {
    port: 5175
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false
      },
      includeAssets: ['favicon.svg', 'apple-touch-icon.svg'],
      manifest: {
        name: 'Lyttejeger - Podcast App',
        short_name: 'Lyttejeger',
        description: 'Finn og filtrer podcaster med verdens beste søkefunksjon',
        theme_color: '#F4F1EA',
        background_color: '#F4F1EA',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/lyttejeger/',
        start_url: '/lyttejeger/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          },
          {
            src: 'apple-touch-icon.svg',
            sizes: '180x180',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB to support large font files
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.podcasters\..*\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'podcast-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
})
