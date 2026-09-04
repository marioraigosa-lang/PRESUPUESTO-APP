import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext'
import { useMoneda, useFormatoMoneda } from '../context/MonedaContext'
import { configMoneda } from '../utils/monedas'
import { limpiarEntradaMonto, formatearEntradaMonto } from '../utils/inputMoneda'
import { COLORES_CUENTA } from '../utils/coloresCuenta'
import MensajeError from './ui/MensajeError'

// Formulario de crear/editar tarjeta -- calco de HojaCuenta.jsx, con una
// diferencia de fondo: "cupo_total" NUNCA se bloquea por tener movimientos
// (no es un ancla como "saldo_inicial" -- ver services/tarjetas.js), así que
// siempre es editable. La única regla es que no puede bajar por debajo de la
// deuda actual de la tarjeta (dejaría "cupo_disponible" negativo).
function HojaTarjeta({ abierta, onCerrar, onGuardar, onActualizar, tarjetaEditando }) {
  const editando = Boolean(tarjetaEditando)
  const deudaActual = editando ? (tarjetaEditando?.deuda ?? 0) : 0
  const { t } = useIdioma()
  const { moneda } = useMoneda()
  const formatear = useFormatoMoneda()
  const { simbolo, decimales } = configMoneda(moneda)

  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState(COLORES_CUENTA[0])
  const [cupoTotal, setCupoTotal] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')

  useEffect(() => {
    if (!abierta) return

    if (tarjetaEditando) {
      setNombre(tarjetaEditando.nombre)
      setColor(tarjetaEditando.color || COLORES_CUENTA[0])
      setCupoTotal(String(tarjetaEditando.cupo_total ?? ''))
    } else {
      setNombre('')
      setColor(COLORES_CUENTA[0])
      setCupoTotal('')
    }
    setError('')
    setErrorGuardado('')
  }, [abierta, tarjetaEditando])

  if (!abierta) return null

  function cerrarYLimpiar() {
    setError('')
    setErrorGuardado('')
    onCerrar()
  }

  function manejarCambioNombre(evento) {
    setNombre(evento.target.value)
    setError('')
  }

  function manejarCambioCupo(evento) {
    setCupoTotal(limpiarEntradaMonto(evento.target.value, moneda))
    setError('')
  }

  async function manejarGuardar(evento) {
    evento.preventDefault()

    if (!nombre.trim()) {
      setError(t('tarjetas.formulario.errorNombreVacio'))
      return
    }
    if (cupoTotal === '' || Number(cupoTotal) <= 0) {
      setError(t('tarjetas.formulario.errorCupoInvalido'))
      return
    }
    // Blindaje del lado del formulario -- el servicio (services/tarjetas.js)
    // vuelve a validar esto mismo antes de escribir, sin importar qué llegue
    // acá; esta comprobación solo evita el viaje de red cuando ya se sabe
    // que va a fallar.
    if (Number(cupoTotal) < deudaActual) {
      setError(t('tarjetas.formulario.errorCupoMenorQueDeuda', { monto: formatear(deudaActual) }))
      return
    }

    setGuardando(true)
    setErrorGuardado('')

    const datos = {
      nombre: nombre.trim(),
      color,
      cupoTotal: Number(cupoTotal),
      // Viaja siempre (no solo al editar) para que el servicio decida por su
      // cuenta -- mismo criterio que cantidadMovimientos en HojaCuenta.jsx.
      deudaActual,
    }

    try {
      if (editando) {
        await onActualizar(tarjetaEditando.id, datos)
      } else {
        await onGuardar(datos)
      }

      cerrarYLimpiar()
    } catch (err) {
      console.error(err)
      setErrorGuardado(true)
    } finally {
      setGuardando(false)
    }
  }

  const cupoTotalFormateado = formatearEntradaMonto(cupoTotal, moneda)

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label={t('tarjetas.formulario.cerrarAria')}
        onClick={cerrarYLimpiar}
        className="absolute inset-0 animate-[fondo-aparecer_0.2s_ease-out] bg-black/60"
      />

      <form
        onSubmit={manejarGuardar}
        className="relative z-10 flex w-full max-w-[460px] animate-[hoja-subir_0.2s_ease-out] flex-col gap-4 rounded-t-3xl border-t border-line bg-panel shadow-elevated p-5 pb-6"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-line" />

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">
            {editando ? t('tarjetas.formulario.editarTitulo') : t('tarjetas.formulario.nuevoTitulo')}
          </h2>
          <button
            type="button"
            onClick={cerrarYLimpiar}
            aria-label={t('tarjetas.formulario.cerrarAria')}
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div>
          <label htmlFor="nombreTarjeta" className="mb-1 block text-xs text-text-dim">
            {t('tarjetas.formulario.nombreLabel')}
          </label>
          <input
            id="nombreTarjeta"
            type="text"
            value={nombre}
            onChange={manejarCambioNombre}
            placeholder={t('tarjetas.formulario.nombrePlaceholder')}
            className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
          />
        </div>

        <div>
          <p className="mb-1 text-xs text-text-dim">{t('tarjetas.formulario.colorLabel')}</p>
          <div className="flex flex-wrap gap-2">
            {COLORES_CUENTA.map((opcion) => (
              <button
                key={opcion}
                type="button"
                aria-label={t('tarjetas.formulario.colorAria', { color: opcion })}
                onClick={() => setColor(opcion)}
                className={`h-8 w-8 rounded-full transition-shadow ${
                  color === opcion ? 'ring-2 ring-text ring-offset-2 ring-offset-panel' : ''
                }`}
                style={{ backgroundColor: opcion }}
              />
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="cupoTarjeta" className="mb-1 block text-xs text-text-dim">
            {t('tarjetas.formulario.cupoLabel')}
          </label>
          <div className="flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3">
            <span className="text-2xl font-semibold text-text-dim">{simbolo}</span>
            <input
              id="cupoTarjeta"
              type="text"
              inputMode={decimales > 0 ? 'decimal' : 'numeric'}
              placeholder="0"
              value={cupoTotalFormateado}
              onChange={manejarCambioCupo}
              className="w-full bg-transparent text-2xl font-semibold text-text outline-none placeholder:text-text-dim"
            />
          </div>
          {editando && deudaActual > 0 && (
            <p className="mt-1 text-xs leading-snug text-text-dim">
              {t('tarjetas.formulario.cupoDeudaNota', { monto: formatear(deudaActual) })}
            </p>
          )}
        </div>

        <MensajeError>{error}</MensajeError>
        {errorGuardado && <MensajeError>{t('tarjetas.formulario.errorGuardar')}</MensajeError>}

        <button
          type="submit"
          disabled={guardando}
          className="mt-1 w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg disabled:opacity-60"
        >
          {guardando
            ? t('tarjetas.formulario.guardando')
            : editando
              ? t('tarjetas.formulario.guardarCambios')
              : t('tarjetas.formulario.guardarTarjeta')}
        </button>
      </form>
    </div>
  )
}

export default HojaTarjeta
