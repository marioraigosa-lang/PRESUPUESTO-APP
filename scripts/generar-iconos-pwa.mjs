// Genera los PNG de la PWA a partir de public/icono.svg y
// public/icono-maskable.svg. Se corre a mano (no en cada build) cada vez
// que el logo cambie: `node scripts/generar-iconos-pwa.mjs`.
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const raiz = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(raiz, '..', 'public')

const icono = readFileSync(path.join(publicDir, 'icono.svg'))
const iconoMaskable = readFileSync(path.join(publicDir, 'icono-maskable.svg'))

const tareas = [
  { origen: icono, salida: 'pwa-192x192.png', tamano: 192 },
  { origen: icono, salida: 'pwa-512x512.png', tamano: 512 },
  { origen: icono, salida: 'apple-touch-icon.png', tamano: 180 },
  { origen: iconoMaskable, salida: 'pwa-maskable-512x512.png', tamano: 512 },
]

for (const { origen, salida, tamano } of tareas) {
  await sharp(origen)
    .resize(tamano, tamano)
    .png()
    .toFile(path.join(publicDir, salida))
  console.log(`Generado public/${salida} (${tamano}x${tamano})`)
}
