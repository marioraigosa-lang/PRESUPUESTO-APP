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
    <form onSubmit={manejarEnvio} className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-5 pt-1">
        <ResumenBorrador borrador={borrador} pasos={pasos} cuentas={cuentas} tarjetas={tarjetas} categorias={categorias} />

        <h2 className="text-xl font-bold leading-tight text-text">
          {t('movimientos.formulario.montoLabel')}
        </h2>

        <div className="flex items-center gap-3 rounded-2xl border border-line/60 bg-panel-2 px-4 py-4 transition-colors focus-within:border-mint/50">
          <span className="text-2xl font-semibold text-text-dim">{simbolo}</span>
          <input
            ref={inputRef}
            type="text"
            inputMode={decimales > 0 ? 'decimal' : 'numeric'}
            placeholder="0"
            value={formatearEntradaMonto(monto, moneda)}
            onChange={(evento) => setMonto(limpiarEntradaMonto(evento.target.value, moneda))}
            className="w-full bg-transparent text-3xl font-bold text-text outline-none placeholder:text-text-dim"
          />
        </div>

        {montoExcedeCupo && <p className="text-sm text-coral">{t('movimientos.formulario.avisoCupoExcedido')}</p>}
      </div>

      {/* Footer "fijo" vía sticky (no position:fixed): se queda pegado al
          fondo del área con scroll del asistente sin salirse del panel
          redondeado. El -mx-5/px-5 cancela el padding del contenedor para
          que el fondo del footer cubra todo el ancho, con un filo superior
          que lo separa del contenido cuando hay scroll debajo. La safe-area
          inferior ya la reserva el contenedor del panel. */}
      <div className="sticky bottom-0 -mx-5 mt-5 border-t border-line/60 bg-panel px-5 pb-4 pt-3">
        <button
          type="submit"
          disabled={!puedeAvanzar}
          className="w-full rounded-xl bg-mint py-3.5 text-sm font-semibold text-bg transition-transform active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
        >
          {t('movimientos.asistente.siguiente')}
        </button>
      </div>
    </form>
  )
}

export default PasoMonto
