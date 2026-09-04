import { CreditCard, ChevronRight } from 'lucide-react'
import { useFormatoMoneda } from '../context/MonedaContext'
import { useIdioma } from '../context/IdiomaContext'

// Tarjeta de crédito, componente visual para la sección "Tarjetas" de
// Home.jsx -- a propósito NO es un calco de Cuenta.jsx (fila con círculo de
// inicial): diseño rectangular de bloque completo, con el color de la
// tarjeta como fondo, para que de un vistazo se distinga de una cuenta de
// ahorro en la misma pantalla. "text-bg"/"bg-bg" son los mismos tokens que
// ya usa el resto de la app para texto/superficies de alto contraste sobre
// un color saturado (ver Cuenta.jsx, botones primarios) -- no es un color
// nuevo, es "el fondo de la app" reusado como contraste.
//
// `onClick` queda preparado para la Fase 5 del plan de tarjetas de crédito
// (pantalla de detalle navegable, con el botón "Pagar tarjeta") -- por ahora
// quien llama (Home.jsx) puede pasar un no-op sin que este componente tenga
// que cambiar cuando esa fase llegue.
function Tarjeta({ nombre, color, cupo_total, deuda, cupo_disponible, onClick }) {
  const formatear = useFormatoMoneda()
  const { t } = useIdioma()

  const porcentajeUsado = cupo_total > 0 ? Math.min(100, Math.round((deuda / cupo_total) * 100)) : 0

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('tarjetas.abrirAria', { nombre })}
      className="flex w-full flex-col gap-3 rounded-2xl p-4 text-left shadow-card transition-transform active:scale-[0.99]"
      style={{ backgroundColor: color }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg/20 text-bg">
            <CreditCard className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="truncate text-sm font-semibold text-bg">{nombre}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-bg/80" aria-hidden="true" />
      </div>

      <div>
        <p className="text-xs text-bg/70">{t('tarjetas.deudaLabel')}</p>
        <p className="text-xl font-bold text-bg">{formatear(deuda)}</p>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg/20">
        <div className="h-full rounded-full bg-bg/80" style={{ width: `${porcentajeUsado}%` }} />
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-bg/80">
        <span className="truncate">
          {t('tarjetas.disponibleLabel')}: {formatear(cupo_disponible)}
        </span>
        <span className="shrink-0 truncate">
          {t('tarjetas.cupoTotalLabel')}: {formatear(cupo_total)}
        </span>
      </div>
    </button>
  )
}

export default Tarjeta
