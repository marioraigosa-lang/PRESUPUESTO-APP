import { useState } from 'react'
import { useIdioma } from '../context/IdiomaContext'
import { useGuia } from '../context/GuiaContext'

// Carrusel corto (máximo 4 tarjetas, a propósito, para no abrumar) que
// App.jsx muestra UNA sola vez, la primera vez que un usuario nuevo entra
// (ver GuiaContext.jsx / perfiles.guia_vista). "Saltar" y terminar el
// carrusel llaman a lo MISMO (marcarGuiaVista): cerrar de cualquier forma
// marca la guía como vista, para que nunca vuelva a aparecer sola.
//
// Los emoji van hardcodeados acá (no en i18n), mismo criterio que ya usa
// NavegacionInferior.jsx y GuiaUso.jsx para sus íconos decorativos.
const TARJETAS = [
  { emoji: '👋', claveTitulo: 'guia.bienvenida.tarjeta1Titulo', claveTexto: 'guia.bienvenida.tarjeta1Texto' },
  { emoji: '💸', claveTitulo: 'guia.bienvenida.tarjeta2Titulo', claveTexto: 'guia.bienvenida.tarjeta2Texto' },
  { emoji: '🛟', claveTitulo: 'guia.bienvenida.tarjeta3Titulo', claveTexto: 'guia.bienvenida.tarjeta3Texto' },
  { emoji: '📖', claveTitulo: 'guia.bienvenida.tarjeta4Titulo', claveTexto: 'guia.bienvenida.tarjeta4Texto' },
]

function GuiaBienvenida() {
  const { t } = useIdioma()
  const { marcarGuiaVista } = useGuia()
  const [paso, setPaso] = useState(0)

  const esUltimo = paso === TARJETAS.length - 1
  const tarjeta = TARJETAS[paso]

  function manejarSiguiente() {
    if (esUltimo) {
      // Terminar el carrusel = cerrarlo, igual que "Saltar": marca la guía
      // como vista sin importar si el usuario la leyó completa o no.
      marcarGuiaVista()
      return
    }
    setPaso((actual) => actual + 1)
  }

  function manejarAnterior() {
    setPaso((actual) => Math.max(actual - 1, 0))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="relative flex w-full max-w-[400px] flex-col gap-5 rounded-2xl bg-panel p-6 pt-10">
        <button
          type="button"
          onClick={marcarGuiaVista}
          className="absolute right-4 top-4 text-xs font-semibold text-text-dim hover:text-text"
        >
          {t('guia.bienvenida.saltar')}
        </button>

        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-4xl">{tarjeta.emoji}</span>
          <h2 className="text-lg font-semibold text-text">{t(tarjeta.claveTitulo)}</h2>
          <p className="text-sm leading-relaxed text-text-dim">{t(tarjeta.claveTexto)}</p>
        </div>

        <div className="flex items-center justify-center gap-1.5">
          {TARJETAS.map((_, indice) => (
            <span
              key={indice}
              className={`h-1.5 rounded-full transition-all ${
                indice === paso ? 'w-4 bg-mint' : 'w-1.5 bg-panel-2'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {paso > 0 && (
            <button
              type="button"
              onClick={manejarAnterior}
              className="flex-1 rounded-2xl bg-panel-2 py-3 text-sm font-semibold text-text-dim"
            >
              {t('guia.bienvenida.anterior')}
            </button>
          )}
          <button
            type="button"
            onClick={manejarSiguiente}
            className="flex-1 rounded-2xl bg-mint py-3 text-sm font-semibold text-bg"
          >
            {esUltimo ? t('guia.bienvenida.empezar') : t('guia.bienvenida.siguiente')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default GuiaBienvenida
