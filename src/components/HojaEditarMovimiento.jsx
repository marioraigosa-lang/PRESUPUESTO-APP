import { useEffect, useState } from 'react'
import { X, ArrowLeftRight } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext'
import { useMoneda, useFormatoMoneda } from '../context/MonedaContext'
import { configMoneda } from '../utils/monedas'
import { limpiarEntradaMonto, formatearEntradaMonto } from '../utils/inputMoneda'
import { construirDatosMovimiento } from '../utils/construirDatosMovimiento'
import { resolverIconoCategoria } from '../utils/resolverIconoCategoria'
import IconoCategoria from './IconoCategoria'
import MensajeError from './ui/MensajeError'

// Extraído de HojaNuevoMovimiento.jsx (Fase 5 del plan del asistente de
// movimiento): esa hoja mezclaba crear y editar en un solo componente; esta
// se queda SOLO con editar. El tipo del movimiento ya no es un `useState`
// elegible por el usuario -- se toma fijo de `movimientoEditando.tipo` y no
// cambia durante la edición. Esto además cierra un bug latente que tenía el
// formulario viejo: como el selector de tipo quedaba visible mientras se
// editaba un gasto/ingreso/retiro (todo menos traslado), era posible
// cambiarle el tipo a "traslado" a mitad de una edición sin que
// actualizarMovimiento (services/movimientos.js) supiera setear
// cuenta_destino_id -- ver diagnóstico previo a esta fase.
//
// Reglas de edición que preserva, iguales a las de HojaNuevoMovimiento:
//   - Traslado: solo se edita monto y descripción, cuentas bloqueadas
//     (actualizarTraslado en services/movimientos.js no toca las cuentas).
//   - pago_tarjeta y movimientos con gasto_fijo_id nunca llegan acá -- los
//     bloquea `esEditable` en Movimiento.jsx antes de abrir esta hoja.
function HojaEditarMovimiento({ abierta, onCerrar, cuentas, tarjetas = [], categorias, onActualizar, movimientoEditando }) {
  const tipo = movimientoEditando?.tipo ?? ''
  const editandoTraslado = tipo === 'traslado'
  const { t } = useIdioma()
  const { moneda } = useMoneda()
  const { simbolo, decimales } = configMoneda(moneda)
  const formatear = useFormatoMoneda()

  const [monto, setMonto] = useState('')
  const [origen, setOrigen] = useState('cuenta')
  const [cuentaId, setCuentaId] = useState('')
  const [tarjetaId, setTarjetaId] = useState('')
  const [cuentaDestinoId, setCuentaDestinoId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')

  // Mismo criterio que en HojaNuevoMovimiento: si el origen elegido es
  // "tarjeta" y todavía no hay ninguna seleccionada (recién se cambió de
  // "cuenta" a "tarjeta" mientras se edita un gasto), le asigna la primera
  // por defecto.
  useEffect(() => {
    if (origen === 'tarjeta' && !tarjetaId && tarjetas.length > 0) {
      setTarjetaId(tarjetas[0].id)
    }
  }, [origen, tarjetas, tarjetaId])

  // Precarga el formulario con el movimiento a editar. Depende solo de
  // "abierta" y "movimientoEditando" (no de cuentas/categorias) para no
  // resetear lo que el usuario está escribiendo cada vez que esas listas
  // cambien de referencia.
  useEffect(() => {
    if (!abierta || !movimientoEditando) return

    setMonto(String(movimientoEditando.monto))
    if (movimientoEditando.tarjeta_id) {
      setOrigen('tarjeta')
      setTarjetaId(movimientoEditando.tarjeta_id)
      setCuentaId('')
    } else {
      setOrigen('cuenta')
      setCuentaId(movimientoEditando.cuenta_id ?? '')
      setTarjetaId('')
    }
    setCuentaDestinoId(movimientoEditando.cuenta_destino_id ?? '')
    setCategoriaId(movimientoEditando.categoria_id ?? '')
    setDescripcion(movimientoEditando.descripcion ?? '')
    setError('')
    setErrorGuardado('')
  }, [abierta, movimientoEditando])

  if (!abierta || !movimientoEditando) return null

  function manejarCambioMonto(evento) {
    setMonto(limpiarEntradaMonto(evento.target.value, moneda))
    setError('')
  }

  async function manejarGuardar(evento) {
    evento.preventDefault()

    if (!monto || Number(monto) <= 0) {
      setError(t('movimientos.formulario.errorMontoVacio'))
      return
    }

    if (usaTarjeta && !tarjetaId) {
      setError(t('movimientos.formulario.errorTarjetaInvalida'))
      return
    }

    setGuardando(true)
    setErrorGuardado('')

    // Mismo helper puro que usa el asistente paso a paso (Fase 0): arma
    // emoji/icono por tipo/categoría y la descripción de respaldo, para que
    // editar produzca EXACTAMENTE el mismo objeto que crear.
    const datos = construirDatosMovimiento(
      { tipo, monto, origen, cuentaId, tarjetaId, cuentaDestinoId, categoriaId, descripcion },
      { cuentas, categorias, t },
    )

    try {
      await onActualizar(datos)
      onCerrar()
    } catch (err) {
      console.error(err)
      setErrorGuardado(true)
    } finally {
      setGuardando(false)
    }
  }

  const categoriaSeleccionada = categorias.find((categoria) => categoria.id === categoriaId)
  // Solo un gasto puede salir de una tarjeta (ver constraint
  // movimientos_traslado_forma_check en sql/supabase_tarjetas_movimientos.sql).
  const usaTarjeta = tipo === 'gasto' && origen === 'tarjeta'
  const tarjetaSeleccionada = tarjetas.find((tarjeta) => tarjeta.id === tarjetaId)
  const montoExcedeCupo =
    usaTarjeta && tarjetaSeleccionada && Number(monto) > tarjetaSeleccionada.cupo_disponible
  const montoFormateado = formatearEntradaMonto(monto, moneda)
  const nombreCuentaOrigen =
    cuentas.find((cuenta) => cuenta.id === cuentaId)?.nombre ?? t('movimientos.formulario.cuentaEliminada')
  const nombreCuentaDestino =
    cuentas.find((cuenta) => cuenta.id === cuentaDestinoId)?.nombre ?? t('movimientos.formulario.cuentaEliminada')

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label={t('movimientos.formulario.cerrarAria')}
        onClick={onCerrar}
        className="absolute inset-0 animate-[fondo-aparecer_0.2s_ease-out] bg-black/60"
      />

      <form
        onSubmit={manejarGuardar}
        className="relative z-10 flex w-full max-w-[460px] animate-[hoja-subir_0.2s_ease-out] flex-col gap-4 rounded-t-3xl border-t border-line bg-panel shadow-elevated p-5 pb-6"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-line" />

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">{t('movimientos.formulario.editarTitulo')}</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label={t('movimientos.formulario.cerrarAria')}
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {editandoTraslado && (
          <div className="flex items-center justify-center gap-2 rounded-full bg-azul/10 py-2 text-sm font-semibold text-azul">
            <ArrowLeftRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t('movimientos.formulario.trasladoBadge')}</span>
          </div>
        )}

        <div>
          <label htmlFor="monto" className="mb-1 block text-xs text-text-dim">
            {t('movimientos.formulario.montoLabel')}
          </label>
          <div className="flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3">
            <span className="text-2xl font-semibold text-text-dim">{simbolo}</span>
            <input
              id="monto"
              type="text"
              inputMode={decimales > 0 ? 'decimal' : 'numeric'}
              placeholder="0"
              value={montoFormateado}
              onChange={manejarCambioMonto}
              className="w-full bg-transparent text-2xl font-semibold text-text outline-none placeholder:text-text-dim"
            />
          </div>
          {error && <MensajeError className="mt-1 px-3 py-2 text-xs">{error}</MensajeError>}
        </div>

        {editandoTraslado ? (
          <div className="flex flex-col gap-1 rounded-2xl bg-panel-2 px-4 py-3">
            <p className="text-xs text-text-dim">{t('movimientos.formulario.cuentasBloqueadasLabel')}</p>
            <p className="text-sm font-medium text-text">
              {nombreCuentaOrigen} → {nombreCuentaDestino}
            </p>
            <p className="text-xs text-text-dim">{t('movimientos.formulario.cuentasBloqueadasAyuda')}</p>
          </div>
        ) : (
          <>
            {tipo === 'gasto' && tarjetas.length > 0 && (
              <div>
                <p className="mb-1 text-xs text-text-dim">{t('movimientos.formulario.origenLabel')}</p>
                <div className="grid grid-cols-2 gap-1 rounded-full bg-panel-2 p-1">
                  <button
                    type="button"
                    onClick={() => setOrigen('cuenta')}
                    className={`rounded-full py-2 text-xs font-medium transition-colors sm:text-sm ${
                      origen === 'cuenta' ? 'bg-mint text-bg' : 'text-text-dim'
                    }`}
                  >
                    {t('movimientos.formulario.origenCuenta')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrigen('tarjeta')}
                    className={`rounded-full py-2 text-xs font-medium transition-colors sm:text-sm ${
                      origen === 'tarjeta' ? 'bg-coral text-bg' : 'text-text-dim'
                    }`}
                  >
                    {t('movimientos.formulario.origenTarjeta')}
                  </button>
                </div>
              </div>
            )}

            {usaTarjeta ? (
              <div>
                <label htmlFor="tarjeta" className="mb-1 block text-xs text-text-dim">
                  {t('movimientos.formulario.tarjetaLabel')}
                </label>
                <select
                  id="tarjeta"
                  value={tarjetaId}
                  onChange={(evento) => setTarjetaId(evento.target.value)}
                  className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none"
                >
                  {tarjetas.map((tarjeta) => (
                    <option key={tarjeta.id} value={tarjeta.id}>
                      {tarjeta.nombre} ·{' '}
                      {t('movimientos.formulario.cupoDisponibleSufijo', {
                        monto: formatear(tarjeta.cupo_disponible),
                      })}
                    </option>
                  ))}
                </select>
                {montoExcedeCupo && (
                  <p className="mt-1 text-xs text-coral">{t('movimientos.formulario.avisoCupoExcedido')}</p>
                )}
              </div>
            ) : (
              <div>
                <label htmlFor="cuenta" className="mb-1 block text-xs text-text-dim">
                  {t('movimientos.formulario.cuentaLabel')}
                </label>
                <select
                  id="cuenta"
                  value={cuentaId}
                  onChange={(evento) => setCuentaId(evento.target.value)}
                  className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none"
                >
                  {cuentas.map((cuenta) => (
                    <option key={cuenta.id} value={cuenta.id}>
                      {cuenta.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {tipo === 'gasto' && (
          <div>
            <p className="mb-1 text-xs text-text-dim">{t('movimientos.formulario.categoriaLabel')}</p>
            <div className="grid grid-cols-3 gap-2">
              {categorias.map((categoria) => {
                const activo = categoria.id === categoriaId
                return (
                  <button
                    key={categoria.id}
                    type="button"
                    onClick={() => setCategoriaId(categoria.id)}
                    className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-medium transition-colors ${
                      activo ? 'bg-mint text-bg' : 'bg-panel-2 text-text-dim'
                    }`}
                  >
                    <IconoCategoria nombre={resolverIconoCategoria(categoria)} size="md" />
                    {categoria.nombre}
                  </button>
                )
              })}
            </div>
            {categoriaSeleccionada?.descripcion && (
              <p className="mt-2 text-xs text-text-dim">{categoriaSeleccionada.descripcion}</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="descripcion" className="mb-1 block text-xs text-text-dim">
            {t('movimientos.formulario.descripcionLabel')}
          </label>
          <input
            id="descripcion"
            type="text"
            value={descripcion}
            onChange={(evento) => setDescripcion(evento.target.value)}
            placeholder={
              tipo === 'traslado'
                ? t('movimientos.formulario.descripcionPlaceholderTraslado')
                : tipo === 'retiro'
                  ? t('movimientos.formulario.descripcionPlaceholderRetiro')
                  : t('movimientos.formulario.descripcionPlaceholderGasto')
            }
            className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
          />
        </div>

        {errorGuardado && <MensajeError>{t('movimientos.formulario.errorGuardar')}</MensajeError>}

        <button
          type="submit"
          disabled={guardando}
          className="mt-1 w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg disabled:opacity-60"
        >
          {guardando ? t('movimientos.formulario.guardando') : t('movimientos.formulario.guardarCambios')}
        </button>
      </form>
    </div>
  )
}

export default HojaEditarMovimiento
