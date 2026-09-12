import { useIdioma } from '../../context/IdiomaContext'
import { chipsResumenGastoViaje } from './resumenGastoViaje'
import IconoCategoria from '../IconoCategoria'

// Tira de chips ("[icono] Comida · $45.000 · 12 mar") que PasoMontoGastoViaje
// y PasoConceptoGastoViaje muestran arriba para dar contexto de lo que ya se
// decidió. Copiado y adaptado de asistente-movimiento/ResumenBorrador.jsx --
// mismo patrón `tocable`/onSaltar, pero sobre chipsResumenGastoViaje.
function ResumenBorradorGastoViaje({ borrador, pasos, categorias, montoFormateado, fechaFormateada, tocable = false, onSaltar }) {
  const { t } = useIdioma()
  const chips = chipsResumenGastoViaje(borrador, { categorias, montoFormateado, fechaFormateada })

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip, indice) => {
        // El chip de fecha no lleva `paso` (ver resumenGastoViaje.js) -- no
        // hay a dónde saltar, así que nunca es tocable.
        const indicePaso = chip.paso ? pasos.indexOf(chip.paso) : -1
        const esTocable = tocable && indicePaso !== -1
        const clave = chip.paso ?? `chip-${indice}`

        const contenido = (
          <>
            {chip.icono && <IconoCategoria nombre={chip.icono} color={chip.color} size={14} className="shrink-0" />}
            {chip.texto}
          </>
        )

        return esTocable ? (
          <button
            key={clave}
            type="button"
            onClick={() => onSaltar(indicePaso)}
            aria-label={t('viajes.gastoAsistente.editarAria', { campo: chip.texto })}
            className="flex items-center gap-1 rounded-full border border-line/60 bg-panel-2 px-3 py-1 text-xs font-medium text-text-dim transition-colors hover:border-mint/40 hover:text-text"
          >
            {contenido}
          </button>
        ) : (
          <span
            key={clave}
            className="flex items-center gap-1 rounded-full border border-line/60 bg-panel-2 px-3 py-1 text-xs font-medium text-text-dim"
          >
            {contenido}
          </span>
        )
      })}
    </div>
  )
}

export default ResumenBorradorGastoViaje
