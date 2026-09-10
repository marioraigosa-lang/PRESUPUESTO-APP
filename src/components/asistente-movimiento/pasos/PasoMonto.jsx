import { useEffect, useRef, useState } from 'react'
import { useIdioma } from '../../../context/IdiomaContext'
import { useMoneda } from '../../../context/MonedaContext'
import { configMoneda } from '../../../utils/monedas'
import { limpiarEntradaMonto, formatearEntradaMonto } from '../../../utils/inputMoneda'
import ResumenBorrador from '../ResumenBorrador'

// No es un paso de decisión única (el usuario teclea, no elige de una
// lista) -- por eso es el primer paso con botón "Siguiente" en vez de
// auto-avance, y el único además de Concepto con foco automático en su
// input: acá SÍ conviene abrir el teclado de una, es justo lo que se va a
// usar apenas se entra a la pantalla.
function PasoMonto({ borrador, cuentas, tarjetas, categorias, pasos, onAvanzar }) {
  const { t } = useIdioma()
  const { moneda } = useMoneda()
  const { simbolo, decimales } = configMoneda(moneda)
  const [monto, setMonto] = useState(borrador.monto)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const usaTarjeta = borrador.tipo === 'gasto' && borrador.origen === 'tarjeta'
  const tarjetaSeleccionada = tarjetas.find((tarjeta) => tarjeta.id === borrador.tarjetaId)
  const montoExcedeCupo = usaTarjeta && tarjetaSeleccionada && Number(monto) > tarjetaSeleccionada.cupo_disponible
  const puedeAvanzar = Boolean(monto) && Number(monto) > 0

  function manejarEnvio(evento) {
    evento.preventDefault()
    if (!puedeAvanzar) return
    onAvanzar(monto)
  }

  return (
    <form onSubmit={manejarEnvio} className="flex flex-col gap-3">
      <ResumenBorrador borrador={borrador} pasos={pasos} cuentas={cuentas} tarjetas={tarjetas} categorias={categorias} />

      <p className="text-sm text-text-dim">{t('movimientos.formulario.montoLabel')}</p>
      <div className="flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3">
        <span className="text-2xl font-semibold text-text-dim">{simbolo}</span>
        <input
          ref={inputRef}
          type="text"
          inputMode={decimales > 0 ? 'decimal' : 'numeric'}
          placeholder="0"
          value={formatearEntradaMonto(monto, moneda)}
          onChange={(evento) => setMonto(limpiarEntradaMonto(evento.target.value, moneda))}
          className="w-full bg-transparent text-3xl font-semibold text-text outline-none placeholder:text-text-dim"
        />
      </div>

      {montoExcedeCupo && <p className="text-xs text-coral">{t('movimientos.formulario.avisoCupoExcedido')}</p>}

      <button
        type="submit"
        disabled={!puedeAvanzar}
        className="mt-1 rounded-2xl bg-mint py-3.5 text-sm font-semibold text-bg disabled:opacity-40"
      >
        {t('movimientos.asistente.siguiente')}
      </button>
    </form>
  )
}

export default PasoMonto
