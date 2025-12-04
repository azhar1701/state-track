import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/state-track/',
  server: {
    host: "::",
    port: 8080,
  },
  // Set base for GitHub Pages deployment
  base: "/state-track/",
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
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
        start_url: '/state-track/',
        scope: '/state-track/',
        icons: [
          {
            src: '/state-track/favicon.ico',
            sizes: '48x48',
            type: 'image/x-icon'
          },
          {
            src: '/state-track/placeholder.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
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
          docs: ["jspdf", "jspdf-autotable"]
        },
      },
    },
  },
}));
