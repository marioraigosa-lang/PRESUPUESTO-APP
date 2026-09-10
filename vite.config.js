import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Version mostrada en la app (pie de "Cuenta"). Se lee de package.json en
// build; el commit corto viene de la variable que Vercel expone en cada
// deploy (fallback 'dev' en local / preview sin git).
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)))
const APP_VERSION = pkg.version
const BUILD_COMMIT = (process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev').slice(0, 7)

// https://vite.dev/config/
export default defineConfig({
  define: {
    // Inyectadas en el bundle en build-time (ver constantes arriba).
    // src/vite-env.d.ts las declara para el editor/lint.
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __BUILD_COMMIT__: JSON.stringify(BUILD_COMMIT),
  },
  plugins: [
    react(),
    tailwindcss(),
    // PWA minima instalable: genera manifest.webmanifest y un service
    // worker con precache basico del app shell (JS/CSS/HTML + iconos).
    // registerType 'prompt': cuando hay una version nueva, el service
    // worker nuevo queda "waiting" y NO recarga solo -- la app muestra un
    // aviso (src/components/AvisoActualizacion.jsx) y el usuario decide
    // cuando aplicar. injectRegister 'auto' hace que el plugin detecte el
    // import de 'virtual:pwa-register/react' (en src/hooks/useActualizacionPwa.js)
    // y no inyecte un registro duplicado. No hace falta un
    // manifest.webmanifest a mano en public/: el plugin lo genera en el
    // build a partir de `manifest` de aqui abajo, y en dev/build inyecta
    // solo el <link rel="manifest"> en index.html (theme-color y
    // apple-touch-icon se agregan a mano en index.html porque el plugin no
    // los gestiona).
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
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
        // Borra los precaches de versiones anteriores al activar el SW
        // nuevo. Importante en la transicion autoUpdate -> prompt: evita
        // que se acumulen dos generaciones de cache del app shell.
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
