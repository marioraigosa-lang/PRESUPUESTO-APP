// Genera public/politica.html y public/terminos.html a partir de la misma
// fuente de verdad que usa la app (src/data/documentosLegales.js), con la
// misma lógica de presentación que src/components/DocumentoLegal.jsx
// (portada, índice con anclas, secciones en tarjetas con estilo destacado).
// Se corre antes de cada build ("prebuild" en package.json) para que estas
// páginas públicas -- necesarias para que Play Store pueda enlazar la
// Política de Privacidad sin necesidad de iniciar sesión -- nunca queden
// desincronizadas del texto legal que se muestra dentro de la app.
//
// También genera public/eliminar-cuenta.html (ver GUIA_ELIMINAR_CUENTA más
// abajo): la URL pública que pide Google Play para que cualquier usuario --
// incluso sin la app instalada -- sepa cómo eliminar su cuenta y sus datos.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { POLITICA_DATOS, TERMINOS_CONDICIONES } from '../src/data/documentosLegales.js'

const raiz = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(raiz, '..', 'public')

const ICONOS_DESTACADO = {
  contacto:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
  advertencia:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  derechos:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>',
}

const CHEVRON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>'

function escapeHtml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Mismo criterio que resaltarPorDefinir() en DocumentoLegal.jsx: envuelve
// cualquier tramo "[POR DEFINIR: ...]" en un resaltado sutil. Hoy no queda
// ninguno visible en el texto, pero se mantiene por si se agrega uno.
function resaltarPorDefinir(texto) {
  if (typeof texto !== 'string' || !texto.includes('[POR DEFINIR')) return escapeHtml(texto)

  return texto
    .split(/(\[POR DEFINIR:[^\]]*\])/g)
    .map((parte) => (parte.startsWith('[POR DEFINIR') ? `<span class="por-definir">${escapeHtml(parte)}</span>` : escapeHtml(parte)))
    .join('')
}

// Mismo criterio que separarNumeroTitulo() en DocumentoLegal.jsx.
function separarNumeroTitulo(titulo) {
  const coincidencia = titulo.match(/^(\d+)\.\s*(.*)$/)
  if (!coincidencia) return { numero: null, resto: titulo }
  return { numero: coincidencia[1], resto: coincidencia[2] }
}

function renderBloque(bloque) {
  if (bloque.tipo === 'subtitulo') {
    return `<p class="subtitulo">${resaltarPorDefinir(bloque.texto)}</p>`
  }
  if (bloque.tipo === 'lista') {
    return `<ul>${bloque.items.map((item) => `<li>${resaltarPorDefinir(item)}</li>`).join('')}</ul>`
  }
  if (bloque.tipo === 'listaOrdenada') {
    return `<ol>${bloque.items.map((item) => `<li>${resaltarPorDefinir(item)}</li>`).join('')}</ol>`
  }
  return `<p>${resaltarPorDefinir(bloque.texto)}</p>`
}

function renderSeccion(seccion, indice) {
  const { numero, resto } = separarNumeroTitulo(seccion.titulo)
  const icono = seccion.destacado ? ICONOS_DESTACADO[seccion.destacado] : null

  return `
      <section id="seccion-${indice + 1}" class="tarjeta seccion${seccion.destacado === 'advertencia' ? ' seccion-advertencia' : seccion.destacado ? ' seccion-destacada' : ''}">
        <div class="titulo-seccion">
          ${icono ? `<span class="icono-destacado" aria-hidden="true">${icono}</span>` : ''}
          ${numero ? `<span class="numero-seccion">${numero.padStart(2, '0')}</span>` : ''}
          <h2>${escapeHtml(numero ? resto : seccion.titulo)}</h2>
        </div>
        <div class="bloques">
          ${seccion.bloques.map(renderBloque).join('\n          ')}
        </div>
      </section>`
}

function renderIndice(secciones) {
  return `
      <nav class="tarjeta indice" aria-label="Contenido">
        <h2 class="indice-titulo">Contenido</h2>
        <ol class="indice-lista">
          ${secciones
            .map(
              (seccion, indice) => `<li><a href="#seccion-${indice + 1}"><span>${escapeHtml(seccion.titulo)}</span><span class="chevron" aria-hidden="true">${CHEVRON}</span></a></li>`,
            )
            .join('\n          ')}
        </ol>
      </nav>`
}

function generarPagina({
  documento,
  tituloPagina,
  descripcion,
  archivoSalida,
  otraPagina,
  otraPaginaEtiqueta,
  conIndice = true,
}) {
  // `meta` permite a un documento no versionado (la guía de eliminar cuenta)
  // mostrar otro texto en la píldora de la portada.
  const metaTexto =
    documento.meta ?? `Versión ${documento.version} · Última actualización: ${documento.ultimaActualizacion}`

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(tituloPagina)}</title>
  <meta name="description" content="${escapeHtml(descripcion)}" />
  <meta name="robots" content="index, follow" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <style>
    :root {
      --color-bg: #0f1512;
      --color-panel: #161d19;
      --color-panel-2: #1d2621;
      --color-line: #2a352e;
      --color-text: #eef3ef;
      --color-text-dim: #9db0a6;
      --color-mint: #4fd1a5;
      --color-gold: #e9b949;
      --color-coral: #f2795b;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      background-color: var(--color-bg);
      color: var(--color-text);
      font-family: system-ui, "Segoe UI", Roboto, sans-serif;
      font-variant-numeric: tabular-nums;
      line-height: 1.5;
    }
    main {
      max-width: 640px;
      margin: 0 auto;
      padding: 1.5rem 1rem 4rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    a { color: inherit; }
    .volver {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      color: var(--color-text-dim);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 600;
      width: fit-content;
    }
    .volver:hover { color: var(--color-text); }
    .portada {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      border-radius: 1rem;
      background-color: var(--color-panel);
      padding: 1.5rem 1.25rem;
      box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.32), 0 10px 24px -10px rgba(0, 0, 0, 0.48);
    }
    .marca {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .logo-seed {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 0.375rem;
      background-color: var(--color-mint);
      color: var(--color-bg);
      font-size: 0.75rem;
      font-weight: 800;
    }
    .marca-nombre {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: var(--color-text-dim);
    }
    h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      line-height: 1.35;
    }
    .intro {
      margin: 0;
      font-size: 0.9375rem;
      line-height: 1.6;
      color: var(--color-text-dim);
    }
    .meta {
      display: inline-flex;
      width: fit-content;
      align-items: center;
      border-radius: 999px;
      background-color: var(--color-panel-2);
      padding: 0.25rem 0.75rem;
      font-size: 0.6875rem;
      color: var(--color-text-dim);
    }
    .tarjeta {
      border-radius: 1rem;
      background-color: var(--color-panel);
      padding: 1rem;
      box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.32), 0 10px 24px -10px rgba(0, 0, 0, 0.48);
    }
    .indice-titulo {
      margin: 0 0 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-dim);
    }
    .indice-lista {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .indice-lista li {
      border-top: 1px solid var(--color-line);
    }
    .indice-lista li:first-child {
      border-top: none;
    }
    .indice-lista a {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.625rem 0;
      text-decoration: none;
      font-size: 0.875rem;
      color: var(--color-text-dim);
    }
    .indice-lista a:hover { color: var(--color-text); }
    .chevron { width: 1rem; height: 1rem; opacity: 0.4; flex-shrink: 0; }
    .secciones {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .seccion { scroll-margin-top: 1.5rem; }
    .seccion-destacada {
      background-color: rgba(79, 209, 165, 0.1);
      border: 1px solid rgba(79, 209, 165, 0.15);
    }
    .titulo-seccion {
      display: flex;
      align-items: baseline;
      gap: 0.625rem;
    }
    .seccion-advertencia {
      background-color: rgba(242, 121, 91, 0.1);
      border: 1px solid rgba(242, 121, 91, 0.2);
    }
    .seccion-advertencia .icono-destacado { color: var(--color-coral); }
    .icono-destacado {
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
      transform: translateY(2px);
      color: var(--color-mint);
    }
    .numero-seccion {
      flex-shrink: 0;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-mint);
    }
    .titulo-seccion h2 {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 600;
      line-height: 1.35;
    }
    .bloques {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 0.75rem;
      font-size: 0.9375rem;
      line-height: 1.6;
      color: var(--color-text-dim);
    }
    .bloques p { margin: 0; }
    .bloques .subtitulo {
      font-weight: 600;
      color: var(--color-text);
      margin-top: 0.25rem;
    }
    .bloques ul, .bloques ol {
      margin: 0;
      padding-left: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .bloques ul { list-style-type: disc; }
    .bloques ol { list-style-type: decimal; }
    .bloques li::marker { color: rgba(79, 209, 165, 0.6); }
    .por-definir {
      border-radius: 0.25rem;
      background-color: rgba(233, 185, 73, 0.15);
      color: var(--color-gold);
      padding: 0.0625rem 0.25rem;
    }
    footer {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      align-items: center;
      text-align: center;
      padding-top: 1rem;
      font-size: 0.8125rem;
      color: var(--color-text-dim);
    }
    footer a { text-decoration: underline; }
  </style>
</head>
<body>
  <main>
    <a class="volver" href="/">&larr; Seed</a>

    <header class="portada">
      <div class="marca">
        <span class="logo-seed">S</span>
        <span class="marca-nombre">Seed</span>
      </div>
      <h1>${escapeHtml(documento.titulo)}</h1>
      ${documento.intro ? `<p class="intro">${escapeHtml(documento.intro)}</p>` : ''}
      <p class="meta">${escapeHtml(metaTexto)}</p>
    </header>

    ${conIndice ? renderIndice(documento.secciones) : ''}

    <div class="secciones">
      ${documento.secciones.map(renderSeccion).join('\n      ')}
    </div>

    <footer>
      <p>Seed-App &middot; Mario Alonso Raigosa Restrepo &middot; Armenia, Quindío, Colombia</p>
      <p><a href="mailto:seed.fin.app@gmail.com">seed.fin.app@gmail.com</a> &middot; <a href="/${otraPagina}">${escapeHtml(otraPaginaEtiqueta)}</a></p>
    </footer>
  </main>
</body>
</html>
`

  writeFileSync(path.join(publicDir, archivoSalida), html, 'utf-8')
  console.log(`Generado public/${archivoSalida}`)
}

generarPagina({
  documento: POLITICA_DATOS,
  tituloPagina: 'Política de Privacidad - Seed',
  descripcion: 'Política de Tratamiento de Datos Personales de Seed-App, la aplicación de finanzas personales.',
  archivoSalida: 'politica.html',
  otraPagina: 'terminos.html',
  otraPaginaEtiqueta: 'Términos y Condiciones',
})

generarPagina({
  documento: TERMINOS_CONDICIONES,
  tituloPagina: 'Términos y Condiciones - Seed',
  descripcion: 'Términos y Condiciones de Uso de Seed-App, la aplicación de finanzas personales.',
  archivoSalida: 'terminos.html',
  otraPagina: 'politica.html',
  otraPaginaEtiqueta: 'Política de Privacidad',
})

// Contenido de la página pública de eliminación de cuenta (requisito de
// Google Play). Vive acá y no en documentosLegales.js porque no es un
// documento legal versionado ni se muestra dentro de la app. Si cambia el
// flujo real (Perfil -> Zona de peligro -> Eliminar cuenta, ver
// EliminarCuenta.jsx) o las tablas que borra la Edge Function eliminar-cuenta
// (todas con "on delete cascade" hacia auth.users), actualizar este texto.
const GUIA_ELIMINAR_CUENTA = {
  titulo: 'Cómo eliminar tu cuenta de Seed',
  intro:
    'Puedes eliminar tu cuenta de Seed y todos tus datos cuando quieras, sin costo y sin tener que darnos explicaciones. Aquí te contamos cómo hacerlo y qué se borra.',
  meta: 'Seed: Finanzas personales · Mario Alonso Raigosa Restrepo',
  secciones: [
    {
      titulo: '1. Elimínala desde la app',
      bloques: [
        { tipo: 'parrafo', texto: 'Es la forma más rápida, y la haces tú mismo en menos de un minuto:' },
        {
          tipo: 'listaOrdenada',
          items: [
            'Abre Seed e inicia sesión con la cuenta que quieres eliminar.',
            'Entra a tu Perfil.',
            'En la sección "Zona de peligro", toca "Eliminar cuenta".',
            'Confirma tu contraseña y toca "Eliminar mi cuenta permanentemente".',
          ],
        },
        {
          tipo: 'parrafo',
          texto: 'La eliminación es inmediata: en cuanto confirmas, tu cuenta y tus datos se borran de nuestros servidores.',
        },
      ],
    },
    {
      titulo: '2. Qué datos se eliminan',
      bloques: [
        { tipo: 'parrafo', texto: 'Se borra todo lo asociado a tu cuenta, sin excepción:' },
        {
          tipo: 'lista',
          items: [
            'Tu cuenta de acceso: correo, contraseña y verificación en dos pasos.',
            'Tus cuentas y todos sus movimientos: ingresos, gastos, traslados y retiros.',
            'Tus tarjetas de crédito, con sus gastos y pagos.',
            'Tus categorías y gastos fijos.',
            'Tus metas de ahorro y tu fondo de emergencia.',
            'Tus viajes, con sus categorías y gastos.',
            'Tu perfil y preferencias (moneda e idioma).',
            'El registro de tu aceptación de la Política de Privacidad y los Términos.',
          ],
        },
        {
          tipo: 'parrafo',
          texto:
            'No conservamos ninguno de estos datos para otros fines. Se borran de inmediato de nuestra base de datos y no guardamos copias de seguridad de ellos. Si en el futuro activamos copias de seguridad automáticas, tus datos podrían permanecer en ellas un máximo de 30 días antes de desaparecer por completo, y nunca se usarían ni se restaurarían.',
        },
      ],
    },
    {
      titulo: '3. Es permanente',
      destacado: 'advertencia',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Eliminar tu cuenta no se puede deshacer. Una vez borrada, ni tú ni nosotros podremos recuperar tu información. Si más adelante quieres volver a usar Seed, tendrás que crear una cuenta nueva desde cero.',
        },
      ],
    },
    {
      titulo: '4. ¿No puedes entrar a la app?',
      destacado: 'contacto',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Si olvidaste tu contraseña, puedes recuperarla desde la pantalla de inicio de sesión ("¿Olvidaste tu contraseña?") y luego seguir los pasos de arriba.',
        },
        {
          tipo: 'parrafo',
          texto:
            'Si ya desinstalaste la app o no logras entrar, escríbenos a seed.fin.app@gmail.com desde el correo con el que te registraste, con el asunto "Eliminar mi cuenta". Verificaremos que la solicitud venga del titular, eliminaremos tu cuenta y todos tus datos, y te lo confirmaremos por correo en un plazo máximo de quince (15) días hábiles.',
        },
        {
          tipo: 'parrafo',
          texto: 'También puedes escribirnos a ese mismo correo si tienes cualquier duda sobre el proceso.',
        },
      ],
    },
  ],
}

generarPagina({
  documento: GUIA_ELIMINAR_CUENTA,
  tituloPagina: 'Eliminar tu cuenta - Seed',
  descripcion: 'Cómo eliminar tu cuenta de Seed y todos tus datos: pasos en la app, qué se borra y cómo pedir ayuda.',
  archivoSalida: 'eliminar-cuenta.html',
  otraPagina: 'politica.html',
  otraPaginaEtiqueta: 'Política de Privacidad',
  conIndice: false,
})
