import { useIdioma } from '../../../context/IdiomaContext'
import { useFormatoMoneda } from '../../../context/MonedaContext'

// Paso "¿qué tarjeta quieres pagar?" del flujo pago_tarjeta del asistente.
// Lista SOLO las tarjetas con deuda > 0 (las demás no tienen nada que pagar)
// y muestra la deuda actual de cada una ("Debes $X"). AUTO-AVANCE: tocar una
// la elige (llena borrador.tarjetaId) y pasa al paso de monto en el mismo
// toque -- mismo mecanismo que PasoCuenta.
//
// PasoTipo ya garantiza que este paso solo se alcanza si hay al menos una
// tarjeta con deuda (la opción "Pagar tarjeta" no aparece si no), pero el
// caso vacío se contempla igual por si la deuda se salda en otra pestaña
// mientras el asistente sigue abierto.
function PasoTarjetaPago({ borrador, tarjetas, onElegir }) {
  const { t } = useIdioma()
  const formatear = useFormatoMoneda()

  const conDeuda = tarjetas.filter((tarjeta) => (tarjeta.deuda ?? 0) > 0)

  return (
    <div className="flex flex-col gap-5 pt-1">
      <h2 className="text-xl font-bold leading-tight text-text">
        {t('movimientos.asistente.pagoTarjeta.preguntaTarjeta')}
      </h2>

      {conDeuda.length === 0 ? (
        <p className="rounded-xl bg-panel-2 px-4 py-3 text-sm text-text-dim">
          {t('movimientos.asistente.pagoTarjeta.sinTarjetasConDeuda')}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {conDeuda.map((tarjeta) => {
            const sugerida = tarjeta.id === borrador.tarjetaId
            return (
              <button
                key={tarjeta.id}
                type="button"
                onClick={() => onElegir({ tarjetaId: tarjeta.id })}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-150 active:scale-[0.98] ${
                  sugerida
                    ? 'border-transparent bg-panel-2 ring-2 ring-mint/60'
                    : 'border-line/60 bg-panel-2 hover:border-line hover:bg-panel-2/70'
                }`}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-bg shadow-sm"
                  style={{ backgroundColor: tarjeta.color }}
                >
                  {tarjeta.inicial || tarjeta.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{tarjeta.nombre}</p>
                  <p className="truncate text-xs text-coral">
                    {t('movimientos.asistente.pagoTarjeta.deudaSufijo', { monto: formatear(tarjeta.deuda) })}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PasoTarjetaPago
