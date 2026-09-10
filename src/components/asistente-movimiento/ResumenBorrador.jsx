import { useIdioma } from '../../context/IdiomaContext'
import { chipsResumen } from './resumen'

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
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-text-dim">
      {chips.map((chip, indice) => {
        const indicePaso = pasos.indexOf(chip.paso)
        const esTocable = tocable && indicePaso !== -1

        return (
          <span key={chip.paso} className="flex items-center gap-1.5">
            {indice > 0 && <span aria-hidden="true">·</span>}
            {esTocable ? (
              <button
                type="button"
                onClick={() => onSaltar(indicePaso)}
                aria-label={t('movimientos.asistente.editarAria', { campo: chip.texto })}
                className="underline decoration-dotted underline-offset-2 hover:text-text"
              >
                {chip.texto}
              </button>
            ) : (
              <span>{chip.texto}</span>
            )}
          </span>
        )
      })}
    </div>
  )
}

export default ResumenBorrador
