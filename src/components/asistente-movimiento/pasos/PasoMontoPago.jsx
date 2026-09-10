import { useEffect, useRef, useState } from 'react'
import { CheckCheck, Pencil } from 'lucide-react'
import { useIdioma } from '../../../context/IdiomaContext'
import { useMoneda, useFormatoMoneda } from '../../../context/MonedaContext'
import { configMoneda } from '../../../utils/monedas'
import { limpiarEntradaMonto, formatearEntradaMonto } from '../../../utils/inputMoneda'
import ResumenBorrador from '../ResumenBorrador'

// Paso "¿cuánto vas a pagar?" del flujo pago_tarjeta. Dos caminos:
//   - "Pago total": auto-avanza con monto = deuda total de la tarjeta (no
//     hace falta que el usuario teclee nada).
//   - "Pago parcial": revela el campo de monto para escribir cuánto, con la
//     MISMA validación que HojaPagoTarjeta.jsx -- 0 < monto <= deuda (el
//     sobrepago se bloquea acá y otra vez en services/movimientos.js ->
//     pagarTarjeta, "defensa doble").
//
// Igual que PasoMonto, el monto se teclea (no se elige de una lista): es un
// paso con botón "Siguiente" y foco automático en el input. El estado local
// (`modo`, `monto`) se re-deriva de borrador.monto al montar, para que
// volver a este paso desde el mini-resumen no pierda lo elegido.
function PasoMontoPago({ borrador, cuentas, tarjetas, categorias, pasos, onAvanzar }) {
  const { t } = useIdioma()
  const { moneda } = useMoneda()
  const formatear = useFormatoMoneda()
  const { simbolo, decimales } = configMoneda(moneda)

  const tarjeta = tarjetas.find((tarjeta) => tarjeta.id === borrador.tarjetaId)
  const deuda = tarjeta?.deuda ?? 0

  // Al volver a este paso: si el monto guardado es exactamente la deuda, se
  // asume que venía de "Pago total"; si es otro valor > 0, de "Pago parcial";
  // si está vacío, todavía no se eligió.
  const modoInicial = !borrador.monto ? '' : Number(borrador.monto) === deuda ? 'total' : 'parcial'
  const [modo, setModo] = useState(modoInicial)
  const [monto, setMonto] = useState(borrador.monto)
  const inputRef = useRef(null)

  useEffect(() => {
    if (modo === 'parcial') inputRef.current?.focus()
  }, [modo])

  const montoNumero = Number(monto)
  const excedeDeuda = Boolean(monto) && montoNumero > deuda
  const puedeAvanzar = Boolean(monto) && montoNumero > 0 && montoNumero <= deuda

  function elegirTotal() {
    setModo('total')
    onAvanzar(String(deuda))
  }

  function manejarEnvio(evento) {
    evento.preventDefault()
    if (!puedeAvanzar) return
    onAvanzar(monto)
  }

  return (
    <form onSubmit={manejarEnvio} className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-5 pt-1">
        <ResumenBorrador borrador={borrador} pasos={pasos} cuentas={cuentas} tarjetas={tarjetas} categorias={categorias} />

        <div>
          <h2 className="text-xl font-bold leading-tight text-text">
            {t('movimientos.asistente.pagoTarjeta.preguntaMonto')}
          </h2>
          <p className="mt-1 text-sm text-text-dim">
            {t('movimientos.asistente.pagoTarjeta.deudaActual', { monto: formatear(deuda) })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={elegirTotal}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-4 text-sm font-semibold transition-all duration-150 active:scale-[0.97] ${
              modo === 'total'
                ? 'border-transparent bg-mint/15 text-mint ring-2 ring-mint/60'
                : 'border-mint/25 bg-mint/10 text-mint hover:border-mint/45 hover:bg-mint/15'
            }`}
          >
            <CheckCheck className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            {t('movimientos.asistente.pagoTarjeta.opcionTotal')}
            <span className="text-[11px] font-medium text-text-dim">
              {t('movimientos.asistente.pagoTarjeta.opcionTotalNota')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setModo('parcial')}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-4 text-sm font-semibold transition-all duration-150 active:scale-[0.97] ${
              modo === 'parcial'
                ? 'border-transparent bg-panel-2 text-text ring-2 ring-mint/60'
                : 'border-line/60 bg-panel-2 text-text hover:border-line'
            }`}
          >
            <Pencil className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            {t('movimientos.asistente.pagoTarjeta.opcionParcial')}
            <span className="text-[11px] font-medium text-text-dim">
              {t('movimientos.asistente.pagoTarjeta.opcionParcialNota')}
            </span>
          </button>
        </div>

        {modo === 'parcial' && (
          <div>
            <label htmlFor="montoPagoParcial" className="mb-2 block text-sm font-medium text-text">
              {t('movimientos.asistente.pagoTarjeta.montoLabel')}
            </label>
            <div className="flex items-center gap-3 rounded-2xl border border-line/60 bg-panel-2 px-4 py-4 transition-colors focus-within:border-mint/50">
              <span className="text-2xl font-semibold text-text-dim">{simbolo}</span>
              <input
                id="montoPagoParcial"
                ref={inputRef}
                type="text"
                inputMode={decimales > 0 ? 'decimal' : 'numeric'}
                placeholder="0"
                value={formatearEntradaMonto(monto, moneda)}
                onChange={(evento) => setMonto(limpiarEntradaMonto(evento.target.value, moneda))}
                className="w-full bg-transparent text-3xl font-bold text-text outline-none placeholder:text-text-dim"
              />
            </div>
            {excedeDeuda && (
              <p className="mt-2 text-sm text-coral">
                {t('movimientos.asistente.pagoTarjeta.errorSobrepago', { monto: formatear(deuda) })}
              </p>
            )}
          </div>
        )}
      </div>

      {modo === 'parcial' && (
        <div className="sticky bottom-0 -mx-5 mt-5 border-t border-line/60 bg-panel px-5 pb-4 pt-3">
          <button
            type="submit"
            disabled={!puedeAvanzar}
            className="w-full rounded-xl bg-mint py-3.5 text-sm font-semibold text-bg transition-transform active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
          >
            {t('movimientos.asistente.siguiente')}
          </button>
        </div>
      )}
    </form>
  )
}

export default PasoMontoPago
