import { Mail, ShieldCheck, ChevronRight } from 'lucide-react'
import BotonVolver from './ui/BotonVolver'
import Tarjeta from './ui/Tarjeta'

// Íconos discretos para las secciones marcadas como `destacado` en
// documentosLegales.js (ver la nota de estructura al inicio de ese
// archivo). Vive fuera del componente para no recrearse en cada render.
const ICONOS_DESTACADO = {
  contacto: Mail,
  derechos: ShieldCheck,
}

// Envuelve cualquier tramo "[POR DEFINIR: ...]" dentro de un texto en un
// resaltado sutil (fondo/color de aviso), para que los campos legales que
// todavía son borrador salten a la vista mientras se completan -- una vez
// reemplazados por el dato real, el texto vuelve a verse como cualquier
// otro. No modifica el texto en sí, solo cómo se pinta.
function resaltarPorDefinir(texto) {
  if (typeof texto !== 'string' || !texto.includes('[POR DEFINIR')) return texto

  return texto.split(/(\[POR DEFINIR:[^\]]*\])/g).map((parte, indice) =>
    parte.startsWith('[POR DEFINIR') ? (
      <span key={indice} className="rounded bg-gold/15 px-1 py-0.5 text-gold">
        {parte}
      </span>
    ) : (
      parte
    ),
  )
}

// Separa el número inicial de un título de sección ("5. Derechos del
// Titular") de su texto, para poder dibujar el número como un acento
// tipográfico aparte (ver <TituloSeccion>). Si el título no sigue ese
// patrón, se devuelve tal cual -- el título nunca deja de mostrarse completo.
function separarNumeroTitulo(titulo) {
  const coincidencia = titulo.match(/^(\d+)\.\s*(.*)$/)
  if (!coincidencia) return { numero: null, resto: titulo }
  return { numero: coincidencia[1], resto: coincidencia[2] }
}

function TituloSeccion({ titulo, Icono }) {
  const { numero, resto } = separarNumeroTitulo(titulo)
  return (
    <div className="flex items-baseline gap-2.5">
      {Icono && <Icono className="h-4 w-4 shrink-0 translate-y-0.5 text-mint" aria-hidden="true" />}
      {numero && <span className="shrink-0 text-[13px] font-semibold tabular-nums text-mint">{numero.padStart(2, '0')}</span>}
      <h2 className="text-[15px] font-semibold leading-snug text-text">{numero ? resto : titulo}</h2>
    </div>
  )
}

// Dibuja uno de los cuatro tipos de bloque que puede tener una sección de un
// documento legal (ver la estructura documentada en
// src/data/documentosLegales.js). Vive fuera del componente para no
// recrearse en cada render.
function Bloque({ bloque }) {
  if (bloque.tipo === 'subtitulo') {
    return <p className="mt-1 text-sm font-semibold text-text">{resaltarPorDefinir(bloque.texto)}</p>
  }
  if (bloque.tipo === 'lista') {
    return (
      <ul className="list-disc space-y-1.5 pl-5 marker:text-mint/60">
        {bloque.items.map((item) => (
          <li key={item}>{resaltarPorDefinir(item)}</li>
        ))}
      </ul>
    )
  }
  if (bloque.tipo === 'listaOrdenada') {
    return (
      <ol className="list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-mint/60">
        {bloque.items.map((item) => (
          <li key={item}>{resaltarPorDefinir(item)}</li>
        ))}
      </ol>
    )
  }
  return <p>{resaltarPorDefinir(bloque.texto)}</p>
}

// Pantalla de solo lectura genérica para un documento legal (Política de
// Tratamiento de Datos, Términos y Condiciones). No sabe nada del contenido
// en sí -- recibe `documento` con la forma { titulo, version,
// ultimaActualizacion, secciones } (ver src/data/documentosLegales.js) y solo
// se encarga de mostrarlo con el estilo de la app. Agregar un tercer
// documento el día de mañana es sumar sus datos y una vista delgada que
// reutilice este mismo componente, no duplicar el layout.
//
// Diseño en tres bloques: (1) una "portada" con la identidad de Seed, el
// título y la línea de versión/fecha; (2) un índice que enlaza (ancla real
// <a href="#seccion-N">, no solo visual) a cada sección -- el scroll suave
// hasta ahí viene de `scroll-behavior: smooth` en index.css, y cada tarjeta
// de sección lleva `scroll-mt` para no quedar pegada al borde de la
// pantalla al saltar; (3) las secciones en sí, cada una en su tarjeta, con
// el número separado del título como acento tipográfico y las que marcan
// `destacado` en un tono levemente distinto para que resalten sin salirse
// del tono sobrio del resto.
function DocumentoLegal({ documento, onVolver, volverAria, metaTexto, indiceTitulo }) {
  return (
    <main className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-[460px] flex-col gap-5 pb-28">
        <BotonVolver onClick={onVolver} ariaLabel={volverAria} />

        <header className="superficie-hero flex flex-col gap-4 rounded-2xl px-5 py-6 shadow-card">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-mint text-xs font-bold text-bg">S</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-dim">Seed</span>
          </div>
          <h1 className="text-xl font-semibold leading-snug text-text">{documento.titulo}</h1>
          <p className="inline-flex w-fit items-center rounded-full bg-panel-2 px-3 py-1 text-[11px] text-text-dim">
            {resaltarPorDefinir(metaTexto)}
          </p>
        </header>

        <Tarjeta>
          <nav aria-label={indiceTitulo}>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-dim">{indiceTitulo}</h2>
            <ol className="divide-y divide-line/60">
              {documento.secciones.map((seccion, indice) => (
                <li key={seccion.titulo}>
                  <a
                    href={`#seccion-${indice + 1}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm text-text-dim transition-colors hover:text-text"
                  >
                    <span>{seccion.titulo}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-40" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </Tarjeta>

        <div className="flex flex-col gap-5">
          {documento.secciones.map((seccion, indice) => (
            <Tarjeta
              key={seccion.titulo}
              id={`seccion-${indice + 1}`}
              variante={seccion.destacado ? 'mint' : 'panel'}
              className={`scroll-mt-6 ${seccion.destacado ? 'border border-mint/15' : ''}`}
            >
              <TituloSeccion titulo={seccion.titulo} Icono={seccion.destacado ? ICONOS_DESTACADO[seccion.destacado] : null} />
              <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-text-dim">
                {seccion.bloques.map((bloque, indiceBloque) => (
                  <Bloque key={indiceBloque} bloque={bloque} />
                ))}
              </div>
            </Tarjeta>
          ))}
        </div>
      </div>
    </main>
  )
}

export default DocumentoLegal
