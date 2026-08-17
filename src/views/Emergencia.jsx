import { useState } from 'react'
import AnilloMeses from '../components/AnilloMeses'
import AvatarUsuario from '../components/AvatarUsuario'
import TarjetaMeta from '../components/TarjetaMeta'
import HojaNuevaMeta from '../components/HojaNuevaMeta'
import { useFormatoMoneda } from '../context/MonedaContext'
import { useIdioma } from '../context/IdiomaContext'
import { mensajeFondo } from '../utils/mensajeFondo'
import { gastoMensualPromedio } from '../utils/gastoMensualPromedio'
import { useDatosUsuario } from '../lib/datosUsuario'
import { useConsulta } from '../hooks/useConsulta'
import AyudaContextual from '../components/AyudaContextual'
import MensajeError from '../components/ui/MensajeError'

const CLASES_TONO = {
  alerta: 'bg-coral/10 text-coral',
  neutral: 'bg-panel-2 text-text',
  positivo: 'bg-mint/10 text-mint',
}

function Emergencia() {
  const { seleccionarPropio, insertarPropio, actualizarPropio, eliminarPropio } = useDatosUsuario()
  const formatear = useFormatoMoneda()
  const { t, tp } = useIdioma()
  const [guardandoFondo, setGuardandoFondo] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState(null)

  const [errorEliminarMeta, setErrorEliminarMeta] = useState(null)
  const [eliminandoMetaId, setEliminandoMetaId] = useState(null)
  const [hojaMetaAbierta, setHojaMetaAbierta] = useState(false)
  const [metaEditando, setMetaEditando] = useState(null)

  // Cada usuario tiene su propia fila de fondo, creada normalmente por el
  // trigger handle_new_user al registrarse -- pero una cuenta anterior a
  // ese trigger (o que por cualquier otro motivo se quedó sin fila) no la
  // tiene. Por eso .maybeSingle() en vez de .single(): con 0 filas
  // devuelve data=null en vez de lanzar error, y más abajo la creamos
  // nosotros mismos con los mismos valores por defecto que usa el trigger
  // (monto_actual 0, meses_meta 6). Así la pantalla nunca se rompe por
  // esto, sea cual sea la razón de que falte la fila.
  async function cargarFondo() {
    const [fondoResp, cuentasAhorroResp, movimientosResp] = await Promise.all([
      seleccionarPropio('fondo_emergencia', 'id, meses_meta').maybeSingle(),
      seleccionarPropio('cuentas', 'nombre, saldo').eq('es_ahorro', true),
      seleccionarPropio('movimientos', 'tipo, monto, fecha'),
    ])

    const error = fondoResp.error || cuentasAhorroResp.error || movimientosResp.error

    if (error) throw new Error(error.message)

    let fondo = fondoResp.data
    if (!fondo) {
      const { data: fondoCreado, error: errorCrear } = await insertarPropio('fondo_emergencia', {
        monto_actual: 0,
        meses_meta: 6,
      })
        .select('id, meses_meta')
        .single()

      if (errorCrear) throw new Error(errorCrear.message)
      fondo = fondoCreado
    }

    const fondoActual = cuentasAhorroResp.data.reduce((suma, cuenta) => suma + cuenta.saldo, 0)
    const cuentasAhorro = cuentasAhorroResp.data.map((cuenta) => cuenta.nombre)

    // Movimientos tipo 'ingreso': los 'traslado' no son ingreso real (mueven
    // plata entre cuentas propias).
    const ingresos = movimientosResp.data
      .filter((movimiento) => movimiento.tipo === 'ingreso')
      .map((movimiento) => ({ monto: movimiento.monto, fecha: movimiento.fecha }))

    // Movimientos tipo 'gasto': incluye tanto gastos fijos ya PAGADOS (se
    // guardan como movimiento con gasto_fijo_id al marcarlos) como gastos
    // variables manuales. Los 'traslado' no son gasto real y el 'ingreso'
    // ya queda fuera con este filtro.
    const gastos = movimientosResp.data
      .filter((movimiento) => movimiento.tipo === 'gasto')
      .map((movimiento) => ({ monto: movimiento.monto, fecha: movimiento.fecha }))

    // Con un solo mes de actividad usamos ese mes tal cual; con dos o más,
    // promediamos entre los meses que sí tuvieron actividad (ver
    // utils/gastoMensualPromedio.js: la misma función genérica sirve tanto
    // para gastos como para ingresos, ambos son solo "montos con fecha").
    const gastoMensual = gastoMensualPromedio(gastos)
    const ingresoMensual = gastoMensualPromedio(ingresos)
    // Ambos lados ya son promedios mensuales, así que se pueden comparar
    // directamente (antes se restaba un gasto promediado de un ingreso
    // sumado de todo el historial, lo que inflaba la capacidad de ahorro).
    const capacidadAhorroMensual = ingresoMensual - gastoMensual

    return {
      fondoId: fondo.id,
      metaMeses: fondo.meses_meta,
      gastoMensual,
      fondoActual,
      cuentasAhorro,
      capacidadAhorroMensual,
    }
  }

  const {
    datos: datosFondo,
    cargando: cargandoFondo,
    error: errorFondo,
    establecerDatos: setDatosFondo,
  } = useConsulta(cargarFondo, [], {
    fondoId: null,
    metaMeses: 6,
    gastoMensual: 0,
    fondoActual: 0,
    cuentasAhorro: [],
    capacidadAhorroMensual: 0,
  })

  const { fondoId, metaMeses, gastoMensual, fondoActual, cuentasAhorro, capacidadAhorroMensual } =
    datosFondo

  async function cargarMetas() {
    const { data, error } = await seleccionarPropio('metas_ahorro', '*').order('fecha_objetivo', {
      ascending: true,
    })

    if (error) throw new Error(error.message)

    return data
  }

  const {
    datos: metas,
    cargando: cargandoMetas,
    error: errorMetas,
    establecerDatos: setMetas,
  } = useConsulta(cargarMetas, [], [])

  const mesesCubiertos = gastoMensual > 0 ? Math.round((fondoActual / gastoMensual) * 10) / 10 : 0
  const meta = gastoMensual * metaMeses
  // Con gastoMensual en 0 no hay nada que "cubrir": mesesCubiertos también
  // da 0, pero eso no significa lo mismo que un fondo insuficiente frente a
  // gastos reales, así que no reutilizamos mensajeFondo (que interpretaría
  // ese 0 como "cubre menos de un mes").
  const { clave: claveMensaje, tono } =
    gastoMensual > 0
      ? mensajeFondo(mesesCubiertos)
      : { clave: 'emergencia.mensajeSinGastos', tono: 'neutral' }

  async function manejarAjustarMeta() {
    const respuesta = window.prompt(t('emergencia.promptMeta'))
    if (respuesta === null) return

    const meses = Number(respuesta)
    if (!Number.isFinite(meses) || meses < 1 || meses > 12) return

    const anterior = metaMeses
    const nuevaMeta = Math.round(meses)

    setErrorGuardado(null)
    setDatosFondo((actual) => ({ ...actual, metaMeses: nuevaMeta }))
    setGuardandoFondo(true)

    try {
      const { error } = await actualizarPropio('fondo_emergencia', { meses_meta: nuevaMeta }).eq(
        'id',
        fondoId,
      )

      if (error) throw error
    } catch (error) {
      console.error(error)
      setDatosFondo((actual) => ({ ...actual, metaMeses: anterior }))
      setErrorGuardado(t('emergencia.metaErrorGuardar'))
    } finally {
      setGuardandoFondo(false)
    }
  }

  function ordenarPorFecha(metas) {
    return [...metas].sort((a, b) => (a.fecha_objetivo ?? '').localeCompare(b.fecha_objetivo ?? ''))
  }

  async function agregarMeta({ nombre, montoObjetivo, anio, fechaObjetivo }) {
    const { data, error } = await insertarPropio('metas_ahorro', {
      nombre,
      monto_objetivo: montoObjetivo,
      anio,
      fecha_objetivo: fechaObjetivo,
    })
      .select()
      .single()

    if (error) throw new Error(error.message)

    setMetas((actuales) => ordenarPorFecha([...actuales, data]))
  }

  async function actualizarMeta(id, { nombre, montoObjetivo, anio, fechaObjetivo }) {
    const { data, error } = await actualizarPropio('metas_ahorro', {
      nombre,
      monto_objetivo: montoObjetivo,
      anio,
      fecha_objetivo: fechaObjetivo,
    })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)

    setMetas((actuales) => ordenarPorFecha(actuales.map((meta) => (meta.id === id ? data : meta))))
  }

  function abrirCrearMeta() {
    setMetaEditando(null)
    setHojaMetaAbierta(true)
  }

  function abrirEditarMeta(meta) {
    setMetaEditando(meta)
    setHojaMetaAbierta(true)
  }

  function cerrarHojaMeta() {
    setHojaMetaAbierta(false)
    setMetaEditando(null)
  }

  async function eliminarMeta(meta) {
    const confirmado = window.confirm(
      t('emergencia.confirmarEliminarMeta', { nombre: meta.nombre }),
    )
    if (!confirmado) return

    setErrorEliminarMeta(null)
    setEliminandoMetaId(meta.id)

    try {
      const { error } = await eliminarPropio('metas_ahorro').eq('id', meta.id)
      if (error) throw error

      setMetas((actuales) => actuales.filter((m) => m.id !== meta.id))
    } catch (error) {
      console.error(error)
      setErrorEliminarMeta(t('emergencia.metaErrorEliminar'))
    } finally {
      setEliminandoMetaId(null)
    }
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pb-28">
        <header className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-semibold text-text">{t('emergencia.titulo')}</h1>
              <AyudaContextual
                clave="guia.ayuda.fondoEmergenciaCalculo"
                etiqueta={t('guia.ayuda.fondoEmergenciaCalculoAria')}
              />
            </div>
            <p className="text-xs text-text-dim">{t('emergencia.subtitulo')}</p>
          </div>
          <AvatarUsuario />
        </header>

        {cargandoFondo && (
          <p className="px-2 text-sm text-text-dim">{t('emergencia.cargando')}</p>
        )}

        {errorFondo && <MensajeError>{t('emergencia.fondoErrorCarga')}</MensajeError>}

        {!cargandoFondo && !errorFondo && (
          <>
            <section className="flex items-center gap-5 rounded-2xl bg-panel shadow-elevated p-6">
              <div className="flex flex-col items-center gap-2">
                <AnilloMeses mesesCubiertos={mesesCubiertos} metaMeses={metaMeses} />
                <p className="max-w-[9rem] text-center text-[11px] leading-snug text-text-dim">
                  {cuentasAhorro.length > 0
                    ? t('emergencia.calculadoConCuentas', { cuentas: cuentasAhorro.join(', ') })
                    : t('emergencia.sinCuentasAhorro')}
                </p>
              </div>

              <div className="flex flex-1 flex-col gap-3">
                <div>
                  <p className="text-xs text-text-dim">{t('emergencia.fondoActual')}</p>
                  <p className="text-sm font-semibold text-text">{formatear(fondoActual)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-dim">{t('emergencia.gastoMensual')}</p>
                  <p className="text-sm font-semibold text-text">{formatear(gastoMensual)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-dim">{t('emergencia.meta')}</p>
                  <p className="text-sm font-semibold text-text">
                    {formatear(meta)} · {tp('emergencia.metaMeses', metaMeses)}
                  </p>
                </div>
              </div>
            </section>

            <p className={`rounded-2xl px-4 py-3 text-sm font-medium ${CLASES_TONO[tono]}`}>
              {t(claveMensaje)}
            </p>

            <MensajeError>{errorGuardado}</MensajeError>

            <button
              type="button"
              onClick={manejarAjustarMeta}
              disabled={guardandoFondo}
              className="w-full rounded-2xl bg-panel-2 py-3 text-sm font-semibold text-text disabled:opacity-60"
            >
              {t('emergencia.ajustarMeta')}
            </button>

            <div className="rounded-2xl bg-panel p-4">
              <p className="text-xs leading-relaxed text-text-dim">{t('emergencia.explicacion')}</p>
            </div>
          </>
        )}

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text">{t('emergencia.metasTitulo')}</h2>
            <button
              type="button"
              onClick={abrirCrearMeta}
              className="rounded-full bg-panel-2 px-3 py-1.5 text-xs font-semibold text-mint"
            >
              {t('emergencia.nuevaMeta')}
            </button>
          </div>

          {cargandoMetas && <p className="px-2 text-sm text-text-dim">{t('emergencia.cargandoMetas')}</p>}

          {errorMetas && <MensajeError>{t('emergencia.metasErrorCarga')}</MensajeError>}

          <MensajeError>{errorEliminarMeta}</MensajeError>

          {!cargandoMetas && !errorMetas && metas.length === 0 && (
            <p className="rounded-2xl bg-panel p-4 text-sm text-text-dim">
              {t('emergencia.sinMetas')}
            </p>
          )}

          {!cargandoMetas &&
            !errorMetas &&
            metas.map((meta) => (
              <TarjetaMeta
                key={meta.id}
                meta={meta}
                ahorrado={fondoActual}
                capacidadAhorroMensual={capacidadAhorroMensual}
                eliminando={eliminandoMetaId === meta.id}
                onEditar={() => abrirEditarMeta(meta)}
                onEliminar={() => eliminarMeta(meta)}
              />
            ))}
        </section>
      </div>

      <HojaNuevaMeta
        abierta={hojaMetaAbierta}
        metaEditando={metaEditando}
        onCerrar={cerrarHojaMeta}
        onGuardar={agregarMeta}
        onActualizar={actualizarMeta}
      />
    </main>
  )
}

export default Emergencia
