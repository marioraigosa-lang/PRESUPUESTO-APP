import { useIdioma } from '../../context/IdiomaContext'
import { chipsResumenViaje } from './resumenViaje'

// Tira de chips ("Bogotá → Cartagena · 12 mar - 20 mar") que los pasos 2, 3
// y 4 muestran arriba para dar contexto de lo que ya se decidió. Copiado y
// adaptado de asistente-movimiento/ResumenBorrador.jsx -- sin icono (acá
// ningún chip es de categoría), solo texto.
function ResumenBorradorViaje({ borrador, pasos, tocable = false, onSaltar }) {
  const { t, idioma, tp } = useIdioma()
  const chips = chipsResumenViaje(borrador, { idioma, t, tp })

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => {
        const indicePaso = pasos.indexOf(chip.paso)
        const esTocable = tocable && indicePaso !== -1

        return esTocable ? (
          <button
            key={chip.paso}
            type="button"
            onClick={() => onSaltar(indicePaso)}
            aria-label={t('viajes.asistente.editarAria', { campo: chip.texto })}
            className="flex items-center gap-1 rounded-full border border-line/60 bg-panel-2 px-3 py-1 text-xs font-medium text-text-dim transition-colors hover:border-mint/40 hover:text-text"
          >
            {chip.texto}
          </button>
        ) : (
          <span
            key={chip.paso}
            className="flex items-center gap-1 rounded-full border border-line/60 bg-panel-2 px-3 py-1 text-xs font-medium text-text-dim"
          >
            {chip.texto}
          </span>
        )
      })}
    </div>
  )
}

export default ResumenBorradorViaje
