import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext'
import { useMoneda } from '../context/MonedaContext'
import { configMoneda } from '../utils/monedas'
import { limpiarEntradaMonto, formatearEntradaMonto } from '../utils/inputMoneda'
import AyudaContextual from './AyudaContextual'
import MensajeError from './ui/MensajeError'

function HojaNuevoMovimiento({
  abierta,
  onCerrar,
  cuentas,
  categorias,
  onGuardar,
  onActualizar,
  movimientoEditando,
}) {
  const editando = Boolean(movimientoEditando)
  // Un traslado ya existente solo permite editar monto y descripción: las
  // cuentas de origen/destino quedan fijas (ver HojaNuevoMovimiento en el
  // chat de diagnóstico). Si el usuario se equivocó de cuenta, la vía es
  // borrar el traslado y crear uno nuevo.
  const editandoTraslado = editando && movimientoEditando?.tipo === 'traslado'
  const { t } = useIdioma()
  const { moneda } = useMoneda()
  const { simbolo, decimales } = configMoneda(moneda)

  const [tipo, setTipo] = useState('gasto')
  const [monto, setMonto] = useState('')
  const [cuentaId, setCuentaId] = useState(cuentas[0]?.id ?? '')
  const [cuentaDestinoId, setCuentaDestinoId] = useState('')
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id ?? '')
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')

  useEffect(() => {
    if (!cuentaId && cuentas.length > 0) {
      setCuentaId(cuentas[0].id)
    }
  }, [cuentas, cuentaId])

  useEffect(() => {
    if (!categoriaId && categorias.length > 0) {
      setCategoriaId(categorias[0].id)
    }
  }, [categorias, categoriaId])

  // Mantiene la cuenta destino siempre válida mientras se arma un traslado
  // nuevo: si todavía no hay destino elegido, o quedó igual a la cuenta
  // origen (porque el usuario cambió el origen), le asigna automáticamente
  // otra cuenta distinta. No pisa una elección válida que el usuario ya
  // haya hecho.
  useEffect(() => {
    if (editandoTraslado) return
    if (tipo !== 'traslado') return
    if (cuentaDestinoId && cuentaDestinoId !== cuentaId) return

    const alternativa = cuentas.find((cuenta) => cuenta.id !== cuentaId)
    setCuentaDestinoId(alternativa?.id ?? '')
  }, [tipo, cuentaId, cuentaDestinoId, cuentas, editandoTraslado])

  // Precarga el formulario cuando se abre para editar, o lo limpia cuando se
  // abre para crear uno nuevo. Depende solo de "abierta" y "movimientoEditando"
  // (no de cuentas/categorias) para no resetear lo que el usuario está
  // escribiendo cada vez que esas listas cambien de referencia.
  useEffect(() => {
    if (!abierta) return

    if (movimientoEditando) {
      setTipo(movimientoEditando.tipo)
      setMonto(String(movimientoEditando.monto))
      setCuentaId(movimientoEditando.cuenta_id ?? '')
      setCuentaDestinoId(movimientoEditando.cuenta_destino_id ?? '')
      setCategoriaId(movimientoEditando.categoria_id ?? '')
      setDescripcion(movimientoEditando.descripcion ?? '')
    } else {
      setTipo('gasto')
      setMonto('')
      setCuentaId(cuentas[0]?.id ?? '')
      setCuentaDestinoId('')
      setCategoriaId(categorias[0]?.id ?? '')
      setDescripcion('')
    }
    setError('')
    setErrorGuardado('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta, movimientoEditando])

  if (!abierta) return null

  function limpiarFormulario() {
    setTipo('gasto')
    setMonto('')
    setCuentaId(cuentas[0]?.id ?? '')
    setCuentaDestinoId('')
    setCategoriaId(categorias[0]?.id ?? '')
    setDescripcion('')
    setError('')
    setErrorGuardado('')
  }

  function cerrarYLimpiar() {
    limpiarFormulario()
    onCerrar()
  }

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

    if (tipo === 'traslado' && !editandoTraslado) {
      if (!cuentaId || !cuentaDestinoId) {
        setError(t('movimientos.formulario.errorCuentasTraslado'))
        return
      }
      if (cuentaId === cuentaDestinoId) {
        setError(t('movimientos.formulario.errorCuentasIguales'))
        return
      }
    }

    const cuentaOrigenSeleccionada = cuentas.find((cuenta) => cuenta.id === cuentaId)
    const cuentaDestinoSeleccionada = cuentas.find((cuenta) => cuenta.id === cuentaDestinoId)

    setGuardando(true)
    setErrorGuardado('')

    const datos = {
      tipo,
      monto: Number(monto),
      cuentaId,
      cuentaDestinoId: tipo === 'traslado' ? cuentaDestinoId : null,
      categoriaId: tipo === 'gasto' ? categoriaId : null,
      emoji: tipo === 'ingreso' ? '💰' : tipo === 'traslado' ? '🔄' : (categoriaSeleccionada?.emoji ?? '✨'),
      descripcion:
        descripcion.trim() ||
        (tipo === 'ingreso'
          ? t('movimientos.formulario.tipoIngreso')
          : tipo === 'traslado'
            ? `${cuentaOrigenSeleccionada?.nombre ?? t('movimientos.formulario.cuentaGenerica')} → ${
                cuentaDestinoSeleccionada?.nombre ?? t('movimientos.formulario.cuentaGenerica')
              }`
            : (categoriaSeleccionada?.nombre ?? t('movimientos.formulario.tipoGasto'))),
    }

    try {
      if (editando) {
        await onActualizar(datos)
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

  const categoriaSeleccionada = categorias.find((categoria) => categoria.id === categoriaId)
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
            {editando ? t('movimientos.formulario.editarTitulo') : t('movimientos.formulario.nuevoTitulo')}
          </h2>
          <button
            type="button"
            onClick={cerrarYLimpiar}
            aria-label={t('movimientos.formulario.cerrarAria')}
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {editandoTraslado ? (
          <div className="flex items-center justify-center gap-2 rounded-full bg-azul/10 py-2 text-sm font-semibold text-azul">
            <span>{t('movimientos.formulario.trasladoBadge')}</span>
          </div>
        ) : (
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <p className="text-xs text-text-dim">{t('movimientos.formulario.tipoLabel')}</p>
              <AyudaContextual
                clave="guia.ayuda.movimientoTipos"
                etiqueta={t('guia.ayuda.movimientoTiposAria')}
              />
            </div>
            <div className="flex gap-2 rounded-full bg-panel-2 p-1">
              <button
                type="button"
                onClick={() => setTipo('gasto')}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                  tipo === 'gasto' ? 'bg-coral text-bg' : 'text-text-dim'
                }`}
              >
                {t('movimientos.formulario.tipoGasto')}
              </button>
              <button
                type="button"
                onClick={() => setTipo('ingreso')}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                  tipo === 'ingreso' ? 'bg-mint text-bg' : 'text-text-dim'
                }`}
              >
                {t('movimientos.formulario.tipoIngreso')}
              </button>
              <button
                type="button"
                onClick={() => setTipo('traslado')}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                  tipo === 'traslado' ? 'bg-azul text-bg' : 'text-text-dim'
                }`}
              >
                {t('movimientos.formulario.tipoTraslado')}
              </button>
            </div>
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

        {tipo === 'traslado' ? (
          editandoTraslado ? (
            <div className="flex flex-col gap-1 rounded-2xl bg-panel-2 px-4 py-3">
              <p className="text-xs text-text-dim">{t('movimientos.formulario.cuentasBloqueadasLabel')}</p>
              <p className="text-sm font-medium text-text">
                {nombreCuentaOrigen} → {nombreCuentaDestino}
              </p>
              <p className="text-xs text-text-dim">{t('movimientos.formulario.cuentasBloqueadasAyuda')}</p>
            </div>
          ) : (
            <>
              <div>
                <div className="mb-1 flex items-center gap-1.5">
                  <label htmlFor="cuentaOrigen" className="text-xs text-text-dim">
                    {t('movimientos.formulario.cuentaOrigenLabel')}
                  </label>
                  <AyudaContextual clave="guia.ayuda.traslados" etiqueta={t('guia.ayuda.trasladosAria')} />
                </div>
                <select
                  id="cuentaOrigen"
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

              <div>
                <label htmlFor="cuentaDestino" className="mb-1 block text-xs text-text-dim">
                  {t('movimientos.formulario.cuentaDestinoLabel')}
                </label>
                <select
                  id="cuentaDestino"
                  value={cuentaDestinoId}
                  onChange={(evento) => setCuentaDestinoId(evento.target.value)}
                  className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none"
                >
                  {cuentas.map((cuenta) => (
                    <option key={cuenta.id} value={cuenta.id} disabled={cuenta.id === cuentaId}>
                      {cuenta.nombre}
                      {cuenta.id === cuentaId ? t('movimientos.formulario.sufijoOrigen') : ''}
                    </option>
                  ))}
                </select>
              </div>

              {cuentas.length < 2 && (
                <p className="text-xs text-coral">{t('movimientos.formulario.minimoCuentasTraslado')}</p>
              )}
            </>
          )
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
                    <span className="text-lg">{categoria.emoji}</span>
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
          {guardando
            ? t('movimientos.formulario.guardando')
            : editando
              ? t('movimientos.formulario.guardarCambios')
              : t('movimientos.formulario.guardarMovimiento')}
        </button>
      </form>
    </div>
  )
}

export default HojaNuevoMovimiento
