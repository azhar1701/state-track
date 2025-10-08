import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      injectRegister: 'auto',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'placeholder.svg'],
      manifest: {
        name: 'State Track',
        short_name: 'StateTrack',
        description: 'Pelaporan dan pemantauan infrastruktur daerah',
        theme_color: '#0ea5e9',
        background_color: '#0b1220',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/favicon.ico',
            sizes: '48x48',
            type: 'image/x-icon'
          },
          {
            src: '/placeholder.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'assets-cache',
            }
          },
          {
            urlPattern: /\/data\/.*|\.geojson$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'data-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 7 * 24 * 60 * 60 },
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          leaflet: ["leaflet", "react-leaflet"],
          charts: ["recharts"],
          supabase: ["@supabase/supabase-js"],
          docs: ["jspdf", "jspdf-autotable", "xlsx"]
        },
      },
    },
  },
}));
