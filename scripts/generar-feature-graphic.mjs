// Genera el "feature graphic" de Play Store (1024x500) a partir de la
// misma marca (colores, brote) que usa el resto de la app. Produce un SVG
// (con la fuente Plus Jakarta Sans embebida en base64, para que se vea
// correcta al abrirlo en un navegador) y su PNG rasterizado con sharp.
//
// Nota sobre el PNG: el rasterizador SVG->PNG de esta máquina (sharp/
// librsvg) no resuelve fuentes @font-face embebidas en data URI -- cae a
// una fuente de reemplazo poco legible. Por eso el PNG se genera con una
// pila de fuentes de sistema (Segoe UI/Arial) como *reemplazo visual*
// aceptable; el SVG en sí declara Plus Jakarta Sans primero y se ve
// correcto en cualquier navegador o herramienta que sí soporte fuentes
// embebidas (para una versión pixel-perfect del PNG, abrir el SVG en
// Chrome y exportar desde ahí, o usar un conversor online).
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const raiz = path.dirname(fileURLToPath(import.meta.url))
const salidaDir = path.join(raiz, '..', 'store-assets')

const fontPath = path.join(
  raiz,
  '..',
  'node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2',
)
const fontB64 = readFileSync(fontPath).toString('base64')

const ANCHO = 1024
const ALTO = 500

// Mismo trazo del brote que public/icono.svg (viewBox 140x140), sin el
// fondo cuadrado redondeado -- aquí el fondo ya es todo el lienzo.
const BROTE_PATH = `
  <path d="M70 106 L70 66" stroke="#4fd1a5" stroke-width="6" stroke-linecap="round" fill="none"/>
  <path d="M70 74 C50 66 38 74 34 90 C52 92 66 86 70 74 Z" fill="#4fd1a5"/>
  <path d="M70 66 C90 56 104 62 110 78 C90 84 74 80 70 66 Z" fill="#4fd1a5"/>
  <path d="M45 84 L62 79" stroke="#0f1512" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <path d="M84 74 L100 70" stroke="#0f1512" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <path d="M70 104 C58 104 58 114 70 114 C82 114 82 124 70 124" stroke="#4fd1a5" stroke-width="6" stroke-linecap="round" fill="none"/>
  <path d="M70 99 L70 129" stroke="#4fd1a5" stroke-width="6" stroke-linecap="round" fill="none"/>
`

// El brote vive en un viewBox de 140x140; lo escalamos e insertamos
// centrado verticalmente en el lienzo, dentro de la zona segura izquierda.
const ICONO_ESCALA = 1.55 // 140 * 1.55 = 217px de alto
const ICONO_TAM = 140 * ICONO_ESCALA
const ICONO_X = 148
const ICONO_Y = (ALTO - ICONO_TAM) / 2

const TEXTO_X = ICONO_X + ICONO_TAM + 50

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
  <defs>
    <style>
      @font-face {
        font-family: 'Plus Jakarta Sans';
        src: url(data:font/woff2;base64,${fontB64}) format('woff2');
        font-weight: 200 800;
      }
      .marca { font-family: 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif; }
    </style>
    <radialGradient id="fondoGlow" cx="30%" cy="50%" r="75%">
      <stop offset="0%" stop-color="#141c17"/>
      <stop offset="100%" stop-color="#0f1512"/>
    </radialGradient>
    <radialGradient id="broteGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#4fd1a5" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#4fd1a5" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${ANCHO}" height="${ALTO}" fill="url(#fondoGlow)"/>

  <circle cx="${ICONO_X + ICONO_TAM / 2}" cy="${ALTO / 2}" r="220" fill="url(#broteGlow)"/>

  <g transform="translate(${ICONO_X} ${ICONO_Y}) scale(${ICONO_ESCALA})">
    ${BROTE_PATH}
  </g>

  <g class="marca">
    <text x="${TEXTO_X}" y="272" font-size="168" font-weight="800" letter-spacing="-2" fill="#f5f9f6">Seed</text>
    <text x="${TEXTO_X}" y="322" font-size="30" font-weight="500" letter-spacing="0.2" fill="#9db0a6">Tranquilidad financiera, a tu ritmo</text>
  </g>
</svg>
`

writeFileSync(path.join(salidaDir, 'feature-graphic.svg'), svg, 'utf-8')
console.log('Generado store-assets/feature-graphic.svg')

await sharp(Buffer.from(svg)).png().toFile(path.join(salidaDir, 'feature-graphic.png'))
console.log('Generado store-assets/feature-graphic.png (1024x500)')
