import { useEffect, useState } from 'react'
import AnilloMeses from '../components/AnilloMeses'
import AvatarUsuario from '../components/AvatarUsuario'
import TarjetaMeta from '../components/TarjetaMeta'
import HojaNuevaMeta from '../components/HojaNuevaMeta'
import { useFormatoMoneda } from '../context/MonedaContext'
import { useIdioma } from '../context/IdiomaContext'
import { mensajeFondo } from '../utils/mensajeFondo'
import { useDatosUsuario } from '../lib/datosUsuario'

const CLASES_TONO = {
  alerta: 'bg-coral/10 text-coral',
  neutral: 'bg-panel-2 text-text',
  positivo: 'bg-mint/10 text-mint',
}

function Emergencia() {
  const { seleccionarPropio, insertarPropio, actualizarPropio, eliminarPropio } = useDatosUsuario()
  const formatear = useFormatoMoneda()
  const { t, tp } = useIdioma()
  const [fondoId, setFondoId] = useState(null)
  const [fondoActual, setFondoActual] = useState(0)
  const [cuentasAhorro, setCuentasAhorro] = useState([])
  const [metaMeses, setMetaMeses] = useState(6)
  const [gastoMensual, setGastoMensual] = useState(0)
  const [cargandoFondo, setCargandoFondo] = useState(true)
  const [errorFondo, setErrorFondo] = useState(null)
  const [guardandoFondo, setGuardandoFondo] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState(null)

  const [metas, setMetas] = useState([])
  const [cargandoMetas, setCargandoMetas] = useState(true)
  const [errorMetas, setErrorMetas] = useState(null)
  const [errorEliminarMeta, setErrorEliminarMeta] = useState(null)
  const [eliminandoMetaId, setEliminandoMetaId] = useState(null)
  const [hojaMetaAbierta, setHojaMetaAbierta] = useState(false)
  const [metaEditando, setMetaEditando] = useState(null)
  const [capacidadAhorroMensual, setCapacidadAhorroMensual] = useState(0)

  useEffect(() => {
    async function cargarDatos() {
      setCargandoFondo(true)
      setErrorFondo(null)
      setCargandoMetas(true)
      setErrorMetas(null)

      const [fondoResp, gastosFijosResp, categoriasResp, cuentasAhorroResp, metasResp, movimientosResp] =
        await Promise.all([
          // Cada usuario tiene su propia fila de fondo (creada por el trigger
          // al registrarse), así que filtrar por user_id sigue devolviendo
          // como máximo una sola fila: .single() sigue siendo correcto.
          seleccionarPropio('fondo_emergencia', 'id, meses_meta').single(),
          seleccionarPropio('gastos_fijos', 'monto'),
          seleccionarPropio('categorias', 'presupuesto'),
          seleccionarPropio('cuentas', 'nombre, saldo').eq('es_ahorro', true),
          seleccionarPropio('metas_ahorro', '*').order('fecha_objetivo', { ascending: true }),
          seleccionarPropio('movimientos', 'tipo, monto'),
        ])

      if (metasResp.error) {
        setErrorMetas(metasResp.error.message)
      } else {
        setMetas(metasResp.data)
      }
      setCargandoMetas(false)

      const error =
        fondoResp.error ||
        gastosFijosResp.error ||
        categoriasResp.error ||
        cuentasAhorroResp.error ||
        movimientosResp.error

      if (error) {
        setErrorFondo(error.message)
      } else {
        setFondoId(fondoResp.data.id)
        setMetaMeses(fondoResp.data.meses_meta)

        const totalGastosFijos = gastosFijosResp.data.reduce(
          (suma, gasto) => suma + gasto.monto,
          0,
        )
        const totalPresupuestos = categoriasResp.data.reduce(
          (suma, categoria) => suma + categoria.presupuesto,
          0,
        )
        setGastoMensual(totalGastosFijos + totalPresupuestos)

        const fondoCalculado = cuentasAhorroResp.data.reduce(
          (suma, cuenta) => suma + cuenta.saldo,
          0,
        )
        setFondoActual(fondoCalculado)
        setCuentasAhorro(cuentasAhorroResp.data.map((cuenta) => cuenta.nombre))

        const totalIngresos = movimientosResp.data
          .filter((movimiento) => movimiento.tipo === 'ingreso')
          .reduce((suma, movimiento) => suma + movimiento.monto, 0)
        const totalGastosVariables = movimientosResp.data
          .filter((movimiento) => movimiento.tipo === 'gasto')
          .reduce((suma, movimiento) => suma + movimiento.monto, 0)
        setCapacidadAhorroMensual(totalIngresos - (totalGastosFijos + totalGastosVariables))
      }

      setCargandoFondo(false)
    }

    cargarDatos()
  }, [])

  const mesesCubiertos = gastoMensual > 0 ? Math.round((fondoActual / gastoMensual) * 10) / 10 : 0
  const meta = gastoMensual * metaMeses
  const { clave: claveMensaje, tono } = mensajeFondo(mesesCubiertos)

  async function manejarAjustarMeta() {
    const respuesta = window.prompt(t('emergencia.promptMeta'))
    if (respuesta === null) return

    const meses = Number(respuesta)
    if (!Number.isFinite(meses) || meses < 1 || meses > 12) return

    const anterior = metaMeses
    const nuevaMeta = Math.round(meses)

    setErrorGuardado(null)
    setMetaMeses(nuevaMeta)
    setGuardandoFondo(true)

    try {
      const { error } = await actualizarPropio('fondo_emergencia', { meses_meta: nuevaMeta }).eq(
        'id',
        fondoId,
      )

      if (error) throw error
    } catch (error) {
      setMetaMeses(anterior)
      setErrorGuardado(t('emergencia.metaErrorGuardar') + error.message)
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
      setErrorEliminarMeta(t('emergencia.metaErrorEliminar') + error.message)
    } finally {
      setEliminandoMetaId(null)
    }
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pb-28">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-text">{t('emergencia.titulo')}</h1>
            <p className="text-xs text-text-dim">{t('emergencia.subtitulo')}</p>
          </div>
          <AvatarUsuario />
        </header>

        {cargandoFondo && (
          <p className="px-2 text-sm text-text-dim">{t('emergencia.cargando')}</p>
        )}

        {errorFondo && (
          <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {t('emergencia.fondoErrorCarga')}
            {errorFondo}
          </p>
        )}

        {!cargandoFondo && !errorFondo && (
          <>
            <section className="flex items-center gap-5 rounded-2xl bg-panel p-6">
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

            {errorGuardado && (
              <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {errorGuardado}
              </p>
            )}

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

          {errorMetas && (
            <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {t('emergencia.metasErrorCarga')}
              {errorMetas}
            </p>
          )}

          {errorEliminarMeta && (
            <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {errorEliminarMeta}
            </p>
          )}

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
