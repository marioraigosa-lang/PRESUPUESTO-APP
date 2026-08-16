import { useState } from 'react'
import { useIdioma } from '../context/IdiomaContext'

// Un ítem por tema de la guía (Fase 1: solo lectura, sin lógica de negocio).
// El emoji es puramente decorativo -- ayuda a ubicar cada sección de un
// vistazo, mismo criterio que ya usa NavegacionInferior.
const SECCIONES = [
  { id: 'movimientos', emoji: '💸' },
  { id: 'cuentas', emoji: '🏦' },
  { id: 'categorias', emoji: '🏷️' },
  { id: 'gastosFijos', emoji: '📌' },
  { id: 'gastosVariables', emoji: '🛍️' },
  { id: 'fondoEmergencia', emoji: '🛟' },
  { id: 'metas', emoji: '🎯' },
  { id: 'periodo', emoji: '🗓️' },
  { id: 'resumen', emoji: '📊' },
  { id: 'viajes', emoji: '✈️' },
  { id: 'calculadoras', emoji: '🧮' },
  { id: 'preferencias', emoji: '🌍' },
]

function GuiaUso({ onVolver }) {
  const { t } = useIdioma()
  // Acordeón de una sola sección abierta a la vez (no un arreglo/Set de
  // abiertas): con 12 temas, dejar abrir varios a la vez vuelve la pantalla
  // una pared de texto -- justo lo que se quiere evitar en una guía.
  const [seccionAbierta, setSeccionAbierta] = useState(null)

  function alternarSeccion(id) {
    setSeccionAbierta((actual) => (actual === id ? null : id))
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pb-28">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            aria-label={t('guia.volverAria')}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-semibold text-text">{t('guia.titulo')}</h1>
            <p className="text-xs text-text-dim">{t('guia.subtitulo')}</p>
          </div>
        </header>

        <p className="rounded-2xl bg-panel p-4 text-sm leading-relaxed text-text-dim">{t('guia.intro')}</p>

        <div className="flex flex-col gap-2">
          {SECCIONES.map((seccion) => {
            const abierta = seccionAbierta === seccion.id
            return (
              <div key={seccion.id} className="overflow-hidden rounded-2xl bg-panel">
                <button
                  type="button"
                  onClick={() => alternarSeccion(seccion.id)}
                  aria-expanded={abierta}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-panel-2 text-base">
                    {seccion.emoji}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-text">
                    {t(`guia.completa.${seccion.id}.titulo`)}
                  </span>
                  <span
                    className={`shrink-0 text-text-dim transition-transform ${abierta ? 'rotate-180' : ''}`}
                  >
                    ▾
                  </span>
                </button>
                {abierta && (
                  <p className="whitespace-pre-line px-4 pb-4 text-sm leading-relaxed text-text-dim">
                    {t(`guia.completa.${seccion.id}.texto`)}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}

export default GuiaUso
