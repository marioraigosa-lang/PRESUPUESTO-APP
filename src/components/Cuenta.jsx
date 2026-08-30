import { ChevronRight } from 'lucide-react'
import { useFormatoMoneda } from '../context/MonedaContext'
import { useIdioma } from '../context/IdiomaContext'

// Desde la Fase 1 de "cuentas navegables" (ver DetalleCuenta.jsx), tocar
// una cuenta abre sus movimientos -- por eso ahora es un <button> real (no
// un <div>) con feedback de hover/press y un chevron que avisa que se
// puede tocar, en vez de solo una fila informativa.
function Cuenta({ nombre, tipo, color, saldo, inicial, onClick }) {
  const formatear = useFormatoMoneda()
  const { t } = useIdioma()
  const letraInicial = inicial || nombre.charAt(0).toUpperCase()

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('cuentas.detalle.abrirDetalleAria', { nombre })}
      className="flex w-full items-center gap-3 rounded-2xl bg-panel-2 px-4 py-3 text-left transition-colors hover:bg-panel active:scale-[0.99]"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-bg"
        style={{ backgroundColor: color }}
      >
        {letraInicial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">{nombre}</p>
        <p className="truncate text-xs text-text-dim">{tipo}</p>
      </div>
      <p className="shrink-0 text-sm font-semibold text-text">{formatear(saldo)}</p>
      <ChevronRight className="h-4 w-4 shrink-0 text-text-dim" aria-hidden="true" />
    </button>
  )
}

export default Cuenta
