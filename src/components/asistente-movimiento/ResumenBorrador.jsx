import { useIdioma } from '../../context/IdiomaContext'
import { chipsResumen } from './resumen'
import IconoCategoria from '../IconoCategoria'

// Tira de chips ("Gasto · 🍔 Comida · Nómina") que PasoMonto y PasoConcepto
// muestran arriba para dar contexto de lo que ya se decidió. Con
// `tocable`, cada chip cuyo paso todavía exista en `pasos` (no se haya
// saltado, ver flujos.js) es un botón que llama a onSaltar(indicePaso) --
// así se puede corregir una elección anterior sin retroceder paso a paso.
function ResumenBorrador({ borrador, pasos, cuentas, tarjetas, categorias, montoFormateado, tocable = false, onSaltar }) {
  const { t } = useIdioma()
  const chips = chipsResumen(borrador, { cuentas, tarjetas, categorias, t, montoFormateado })

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => {
        const indicePaso = pasos.indexOf(chip.paso)
        const esTocable = tocable && indicePaso !== -1

        // El chip de categoría trae `icono`/`color` (ver chipsResumen) --
        // el resto de chips son solo texto, igual que antes.
        const contenido = (
          <>
            {chip.icono && <IconoCategoria nombre={chip.icono} color={chip.color} size={14} className="shrink-0" />}
            {chip.texto}
          </>
        )

        return esTocable ? (
          <button
            key={chip.paso}
            type="button"
            onClick={() => onSaltar(indicePaso)}
            aria-label={t('movimientos.asistente.editarAria', { campo: chip.texto })}
            className="flex items-center gap-1 rounded-full border border-line/60 bg-panel-2 px-3 py-1 text-xs font-medium text-text-dim transition-colors hover:border-mint/40 hover:text-text"
          >
            {contenido}
          </button>
        ) : (
          <span
            key={chip.paso}
            className="flex items-center gap-1 rounded-full border border-line/60 bg-panel-2 px-3 py-1 text-xs font-medium text-text-dim"
          >
            {contenido}
          </span>
        )
      })}
    </div>
  )
}

export default ResumenBorrador
