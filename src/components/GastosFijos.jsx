import { useState } from 'react'
import GastoFijo from './GastoFijo'
import HojaElegirCuentaPago from './HojaElegirCuentaPago'
import { useFormatoMoneda } from '../context/MonedaContext'
import { useIdioma } from '../context/IdiomaContext'
import { useDatosUsuario } from '../lib/datosUsuario'
import { useConsulta } from '../hooks/useConsulta'
import { rangoFechasPeriodo } from '../utils/formatoPeriodo'
import AyudaContextual from './AyudaContextual'
import MensajeError from './ui/MensajeError'

function GastosFijos({ cuentas, periodo, onMarcarPagado, onDesmarcarPagado, onGestionar }) {
  const { seleccionarPropio } = useDatosUsuario()
  const formatear = useFormatoMoneda()
  const { t } = useIdioma()

  const [guardandoIds, setGuardandoIds] = useState(new Set())
  const [errorGuardado, setErrorGuardado] = useState(null)
  const [gastoSeleccionado, setGastoSeleccionado] = useState(null)
  const [hojaAbierta, setHojaAbierta] = useState(false)

  async function cargarGastosFijos() {
    const { data, error } = await seleccionarPropio('gastos_fijos').order('dia_pago', {
      ascending: true,
    })

    if (error) throw new Error(error.message)

    return data
  }

  const {
    datos: gastos,
    cargando: cargandoGastos,
    error: errorGastos,
  } = useConsulta(cargarGastosFijos, [], [])

  // Mapa gasto_fijo_id -> movimiento vinculado que cae en el mes
  // seleccionado. Es la fuente de verdad de "pagado en este mes": ya no se
  // usa gastos_fijos.pagado (ese campo es global, sin mes) para decidir qué
  // se muestra aquí. A propósito NO se pasa periodo.quincena: un gasto fijo
  // es mensual (no tiene sentido "medio arriendo"), así que siempre se
  // calcula por el mes completo sin importar la quincena seleccionada.
  async function cargarMovimientosDelMes() {
    const { desde, hasta } = rangoFechasPeriodo(periodo.anio, periodo.mes)

    const { data, error } = await seleccionarPropio(
      'movimientos',
      'id, gasto_fijo_id, cuenta_id, monto, fecha',
    )
      .not('gasto_fijo_id', 'is', null)
      .gte('fecha', desde)
      .lte('fecha', hasta)

    if (error) throw new Error(error.message)

    const mapa = {}
    data.forEach((movimiento) => {
      mapa[movimiento.gasto_fijo_id] = movimiento
    })
    return mapa
  }

  const {
    datos: movimientosMes,
    cargando: cargandoMovimientos,
    error: errorMovimientos,
    establecerDatos: setMovimientosMes,
  } = useConsulta(cargarMovimientosDelMes, [periodo.anio, periodo.mes], {})

  // Lista de gastos fijos con su estado "pagado" recalculado para el mes
  // seleccionado (no el campo global de la tabla).
  const gastosConEstado = gastos.map((gasto) => ({
    ...gasto,
    pagado: Boolean(movimientosMes[gasto.id]),
  }))

  function abrirSelectorCuenta(gasto) {
    setErrorGuardado(null)
    setGastoSeleccionado(gasto)
    setHojaAbierta(true)
  }

  function cerrarSelectorCuenta() {
    setHojaAbierta(false)
    setGastoSeleccionado(null)
  }

  async function confirmarPago(cuentaId) {
    const gasto = gastoSeleccionado
    if (!gasto) return

    // Marcamos un placeholder de inmediato para que el checkbox reaccione
    // sin esperar la respuesta del servidor; se reemplaza por el movimiento
    // real (o se revierte) según el resultado.
    setMovimientosMes((actuales) => ({ ...actuales, [gasto.id]: { pendienteDeConfirmar: true } }))
    setGuardandoIds((actuales) => new Set(actuales).add(gasto.id))

    try {
      const movimiento = await onMarcarPagado(gasto, cuentaId, periodo)
      setMovimientosMes((actuales) => ({ ...actuales, [gasto.id]: movimiento }))
      cerrarSelectorCuenta()
    } catch (error) {
      setMovimientosMes((actuales) => {
        const siguiente = { ...actuales }
        delete siguiente[gasto.id]
        return siguiente
      })
      // Se relanza para que la hoja de selección de cuenta muestre el error
      // y el usuario pueda intentar de nuevo sin que la hoja se cierre sola.
      throw error
    } finally {
      setGuardandoIds((actuales) => {
        const siguientes = new Set(actuales)
        siguientes.delete(gasto.id)
        return siguientes
      })
    }
  }

  async function desmarcarPagado(gasto) {
    setErrorGuardado(null)
    const movimientoAnterior = movimientosMes[gasto.id]
    setMovimientosMes((actuales) => {
      const siguiente = { ...actuales }
      delete siguiente[gasto.id]
      return siguiente
    })
    setGuardandoIds((actuales) => new Set(actuales).add(gasto.id))

    try {
      await onDesmarcarPagado(gasto, periodo)
    } catch (error) {
      console.error(error)
      setMovimientosMes((actuales) => ({ ...actuales, [gasto.id]: movimientoAnterior }))
      setErrorGuardado(t('home.errorDesmarcar', { nombre: gasto.nombre }))
    } finally {
      setGuardandoIds((actuales) => {
        const siguientes = new Set(actuales)
        siguientes.delete(gasto.id)
        return siguientes
      })
    }
  }

  function manejarToggle(id) {
    if (guardandoIds.has(id)) return

    const gasto = gastosConEstado.find((g) => g.id === id)
    if (!gasto) return

    if (gasto.pagado) {
      desmarcarPagado(gasto)
    } else {
      abrirSelectorCuenta(gasto)
    }
  }

  const total = gastosConEstado.reduce((suma, gasto) => suma + gasto.monto, 0)
  const totalPagado = gastosConEstado
    .filter((gasto) => gasto.pagado)
    .reduce((suma, gasto) => suma + gasto.monto, 0)
  const totalPendiente = total - totalPagado
  const porcentaje = total === 0 ? 0 : Math.round((totalPagado / total) * 100)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
            {t('home.gastosFijosTitulo')}
          </h2>
          <AyudaContextual
            clave="guia.ayuda.gastoFijoPagado"
            etiqueta={t('guia.ayuda.gastoFijoPagadoAria')}
          />
        </div>
        <button
          type="button"
          onClick={onGestionar}
          className="text-xs font-semibold text-mint"
        >
          {t('home.gestionarGastosFijos')}
        </button>
      </div>

      {(cargandoGastos || cargandoMovimientos) && (
        <p className="px-2 text-sm text-text-dim">{t('home.cargandoGastosFijos')}</p>
      )}

      {(errorGastos || errorMovimientos) && (
        <MensajeError>{t('home.errorCargarGastosFijos')}</MensajeError>
      )}

      <MensajeError>{errorGuardado}</MensajeError>

      {!cargandoGastos && !errorGastos && !cargandoMovimientos && !errorMovimientos && (
        <div className="flex flex-col gap-2 rounded-2xl bg-panel shadow-card p-2">
          {gastosConEstado.map((gasto) => (
            <GastoFijo
              key={gasto.id}
              gasto={gasto}
              onToggle={manejarToggle}
              guardando={guardandoIds.has(gasto.id)}
            />
          ))}

          <div className="mt-1 flex flex-col gap-3 rounded-2xl bg-panel-2 px-4 py-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-mint transition-all"
                style={{ width: `${porcentaje}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text">
                {t('home.pagadoPorcentaje', { porcentaje })}
              </p>
              <p className="text-xs text-text-dim">
                {t('home.pagadoDeTotal', { pagado: formatear(totalPagado), total: formatear(total) })}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-mint/10 px-3 py-2">
              <p className="text-sm font-semibold text-mint">{t('home.faltaPorPagar')}</p>
              <p className="text-sm font-bold text-mint">{formatear(totalPendiente)}</p>
            </div>
          </div>
        </div>
      )}

      <HojaElegirCuentaPago
        abierta={hojaAbierta}
        onCerrar={cerrarSelectorCuenta}
        cuentas={cuentas}
        gasto={gastoSeleccionado}
        onConfirmar={confirmarPago}
      />
    </section>
  )
}

export default GastosFijos
