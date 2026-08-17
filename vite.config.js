import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA minima instalable: genera manifest.webmanifest y un service
    // worker con precache basico del app shell (JS/CSS/HTML + iconos).
    // registerType 'autoUpdate' actualiza el service worker solo en
    // segundo plano cuando hay una version nueva, sin pedirle nada al
    // usuario. No hace falta un manifest.webmanifest a mano en public/: el
    // plugin lo genera en el build a partir de `manifest` de aqui abajo, y
    // en dev/build inyecta solo el <link rel="manifest"> en index.html
    // (theme-color y apple-touch-icon se agregan a mano en index.html
    // porque el plugin no los gestiona).
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icono.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Seed',
        short_name: 'Seed',
        description: 'Tus finanzas sanas, crecen contigo.',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f1512',
        theme_color: '#0f1512',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache basico del app shell (JS/CSS/HTML/fuentes/iconos que
        // genera el build). Sin estrategias de runtime caching para datos
        // de Supabase por ahora -- eso es "offline avanzado", fuera del
        // alcance de esta primera version instalable.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
