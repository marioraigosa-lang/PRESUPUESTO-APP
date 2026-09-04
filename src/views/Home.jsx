import { useState } from 'react'
import Encabezado from '../components/Encabezado'
import SelectorPeriodo from '../components/SelectorPeriodo'
import TarjetaSaldo from '../components/TarjetaSaldo'
import Cuenta from '../components/Cuenta'
import Tarjeta from '../components/Tarjeta'
import GastosFijos from '../components/GastosFijos'
import GastosVariables from '../components/GastosVariables'
import TarjetaPromoMfa from '../components/TarjetaPromoMfa'
import Acordeon from '../components/ui/Acordeon'
import DetalleCuenta from './DetalleCuenta'
import DetalleCategoria from './DetalleCategoria'
import DetalleTarjeta from './DetalleTarjeta'
import { useDatosUsuario } from '../lib/datosUsuario'
import { useConsulta } from '../hooks/useConsulta'
import { useFormatoMoneda } from '../context/MonedaContext'
import { useIdioma } from '../context/IdiomaContext'
import { textoPeriodo, rangoFechasPeriodo } from '../utils/formatoPeriodo'
import MensajeError from '../components/ui/MensajeError'

const hoy = new Date()

// Fases 1 y 2 de "cuentas y categorías navegables": suma navegación interna
// con un estado "modo" ('resumen' | 'detalleCuenta' | 'detalleCategoria'),
// igual que Viajes.jsx -- al tocar una cuenta o una categoría de gasto
// variable se abre su pantalla de detalle con sus movimientos. Este "modo"
// es interno de Home: NO toca el `vista` de App.jsx, así que el botón "+"
// (BotonAgregar) y la barra de navegación inferior -- que dependen de
// vista === 'inicio' -- siguen mostrándose exactamente igual que hoy
// mientras se navega dentro de una cuenta o categoría.
function Home({
  cuentas,
  cargandoCuentas,
  errorCuentas,
  tarjetas,
  cargandoTarjetas,
  errorTarjetas,
  categorias,
  movimientosVersion,
  onGestionarCuentas,
  onGestionarTarjetas,
  onGestionarCategorias,
  onGestionarGastosFijos,
  onMarcarGastoFijoPagado,
  onDesmarcarGastoFijoPagado,
  onEliminarMovimiento,
  onAgregarMovimiento,
  onActualizarMovimiento,
  onPagarTarjeta,
  onIrASeguridad,
}) {
  const { seleccionarPropio } = useDatosUsuario()
  const formatear = useFormatoMoneda()
  const { idioma, t } = useIdioma()
  const [periodo, setPeriodo] = useState({
    mes: hoy.getMonth(),
    anio: hoy.getFullYear(),
    quincena: 'completo',
  })
  const [modo, setModo] = useState('resumen')
  const [cuentaSeleccionadaId, setCuentaSeleccionadaId] = useState(null)
  const [categoriaSeleccionadaId, setCategoriaSeleccionadaId] = useState(null)
  const [tarjetaSeleccionadaId, setTarjetaSeleccionadaId] = useState(null)

  // Ingresos/gastos/ahorro del mes seleccionado, calculados a partir de los
  // movimientos reales (no del saldo de las cuentas, que es el saldo actual
  // y no se filtra por mes).
  async function cargarResumenPeriodo() {
    const { desde, hasta } = rangoFechasPeriodo(periodo.anio, periodo.mes, periodo.quincena)

    const { data, error } = await seleccionarPropio('movimientos', 'tipo, monto')
      .gte('fecha', desde)
      .lte('fecha', hasta)

    if (error) throw new Error(error.message)

    const ingresos = data
      .filter((movimiento) => movimiento.tipo === 'ingreso')
      .reduce((suma, movimiento) => suma + movimiento.monto, 0)
    const gastos = data
      .filter((movimiento) => movimiento.tipo === 'gasto')
      .reduce((suma, movimiento) => suma + movimiento.monto, 0)

    return { ingresos, gastos, ahorro: ingresos - gastos }
  }

  const { datos: resumenPeriodo, error: errorResumen } = useConsulta(
    cargarResumenPeriodo,
    [periodo.anio, periodo.mes, periodo.quincena, movimientosVersion],
    { ingresos: 0, gastos: 0, ahorro: 0 },
  )

  // El total de "Cuentas" (dinero disponible) NUNCA incluye tarjetas: son
  // cosas separadas por diseño (ver sql/supabase_tarjetas.sql) -- un cupo de
  // crédito no es plata del usuario. `tarjetas` es un array aparte que nunca
  // se mezcla con `cuentas`, así que esto no necesita ningún filtro extra.
  const total = cuentas.reduce((suma, cuenta) => suma + cuenta.saldo, 0)

  // Totales de la sección "Tarjetas": deuda total (lo que se debe en TODAS
  // las tarjetas) y cupo disponible total, para el mini-resumen colapsado y
  // el resumen al pie de la lista -- mismo criterio que "Total disponible"
  // en la sección de Cuentas.
  const deudaTotalTarjetas = tarjetas.reduce((suma, tarjeta) => suma + tarjeta.deuda, 0)
  const cupoDisponibleTotalTarjetas = tarjetas.reduce((suma, tarjeta) => suma + tarjeta.cupo_disponible, 0)

  function irMesAnterior() {
    setPeriodo((actual) => {
      const esEnero = actual.mes === 0
      return {
        ...actual,
        mes: esEnero ? 11 : actual.mes - 1,
        anio: esEnero ? actual.anio - 1 : actual.anio,
      }
    })
  }

  function irMesSiguiente() {
    setPeriodo((actual) => {
      const esDiciembre = actual.mes === 11
      return {
        ...actual,
        mes: esDiciembre ? 0 : actual.mes + 1,
        anio: esDiciembre ? actual.anio + 1 : actual.anio,
      }
    })
  }

  function cambiarQuincena(quincena) {
    setPeriodo((actual) => ({ ...actual, quincena }))
  }

  function abrirDetalleCuenta(cuenta) {
    setCuentaSeleccionadaId(cuenta.id)
    setModo('detalleCuenta')
  }

  function abrirDetalleCategoria(categoria) {
    setCategoriaSeleccionadaId(categoria.id)
    setModo('detalleCategoria')
  }

  function abrirDetalleTarjeta(tarjeta) {
    setTarjetaSeleccionadaId(tarjeta.id)
    setModo('detalleTarjeta')
  }

  function volverAResumen() {
    setModo('resumen')
    setCuentaSeleccionadaId(null)
    setCategoriaSeleccionadaId(null)
    setTarjetaSeleccionadaId(null)
  }

  // Se busca por id en `cuentas`/`categorias` (en vez de guardar el objeto
  // completo en el estado) para que, si el saldo o el gasto acumulado
  // cambian al crear/editar/eliminar un movimiento desde el propio detalle,
  // la cabecera de la pantalla se actualice sola en el siguiente render --
  // sin esto quedaría mostrando datos "congelados" del momento en que se
  // tocó la cuenta/categoría. Si ya no existe (se eliminó desde Gestionar
  // cuentas/categorías mientras se veía su detalle), la búsqueda queda
  // undefined y se cae al resumen normal de abajo en vez de romper la
  // pantalla.
  const cuentaActual =
    modo === 'detalleCuenta' && cuentaSeleccionadaId
      ? cuentas.find((c) => c.id === cuentaSeleccionadaId)
      : null

  const categoriaActual =
    modo === 'detalleCategoria' && categoriaSeleccionadaId
      ? categorias.find((c) => c.id === categoriaSeleccionadaId)
      : null

  const tarjetaActual =
    modo === 'detalleTarjeta' && tarjetaSeleccionadaId
      ? tarjetas.find((t) => t.id === tarjetaSeleccionadaId)
      : null

  if (cuentaActual) {
    return (
      <DetalleCuenta
        cuenta={cuentaActual}
        cuentas={cuentas}
        tarjetas={tarjetas}
        categorias={categorias}
        movimientosVersion={movimientosVersion}
        onVolver={volverAResumen}
        onAgregarMovimiento={onAgregarMovimiento}
        onActualizarMovimiento={onActualizarMovimiento}
        onEliminarMovimiento={onEliminarMovimiento}
      />
    )
  }

  if (categoriaActual) {
    return (
      <DetalleCategoria
        categoria={categoriaActual}
        cuentas={cuentas}
        tarjetas={tarjetas}
        categorias={categorias}
        movimientosVersion={movimientosVersion}
        onVolver={volverAResumen}
        onAgregarMovimiento={onAgregarMovimiento}
        onActualizarMovimiento={onActualizarMovimiento}
        onEliminarMovimiento={onEliminarMovimiento}
      />
    )
  }

  if (tarjetaActual) {
    return (
      <DetalleTarjeta
        tarjeta={tarjetaActual}
        cuentas={cuentas}
        tarjetas={tarjetas}
        categorias={categorias}
        movimientosVersion={movimientosVersion}
        onVolver={volverAResumen}
        onActualizarMovimiento={onActualizarMovimiento}
        onEliminarMovimiento={onEliminarMovimiento}
        onPagarTarjeta={onPagarTarjeta}
      />
    )
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pb-28">
        <Encabezado subtitulo={textoPeriodo(periodo, idioma)} />

        <SelectorPeriodo
          periodo={periodo}
          onMesAnterior={irMesAnterior}
          onMesSiguiente={irMesSiguiente}
          onCambiarQuincena={cambiarQuincena}
        />

        <TarjetaSaldo
          titulo={t('home.subtituloDineroDisponible')}
          monto={total}
          resumen={errorResumen ? null : resumenPeriodo}
        />

        <TarjetaPromoMfa onActivar={onIrASeguridad} />

        <Acordeon
          titulo={t('home.misCuentas')}
          resumenColapsado={
            !cargandoCuentas && !errorCuentas && cuentas.length > 0 ? (
              <p className="flex items-baseline gap-1.5">
                <span className="text-xs text-text-dim">{t('home.disponibleEtiqueta')}</span>
                <span className="truncate text-sm font-semibold text-mint">{formatear(total)}</span>
              </p>
            ) : null
          }
        >
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={onGestionarCuentas}
              className="text-xs font-semibold text-mint"
            >
              {t('home.gestionarCuentas')}
            </button>
          </div>

          {cargandoCuentas && (
            <p className="px-2 text-sm text-text-dim">{t('home.cargandoCuentas')}</p>
          )}

          {errorCuentas && <MensajeError>{t('home.errorCargarCuentas')}</MensajeError>}

          {!cargandoCuentas && !errorCuentas && (
            <div className="flex flex-col gap-2 rounded-2xl bg-panel shadow-card p-2">
              {cuentas.map((cuenta) => (
                <Cuenta key={cuenta.id} {...cuenta} onClick={() => abrirDetalleCuenta(cuenta)} />
              ))}

              <div className="mt-1 flex items-center justify-between rounded-2xl bg-mint/10 px-4 py-3">
                <p className="text-sm font-semibold text-mint">{t('home.totalDisponible')}</p>
                <p className="text-sm font-bold text-mint">{formatear(total)}</p>
              </div>
            </div>
          )}
        </Acordeon>

        <Acordeon
          titulo={t('home.misTarjetas')}
          resumenColapsado={
            !cargandoTarjetas && !errorTarjetas && tarjetas.length > 0 ? (
              <p className="flex items-baseline gap-1.5">
                <span className="text-xs text-text-dim">{t('home.deudaTarjetasEtiqueta')}</span>
                <span
                  className={`truncate text-sm font-semibold ${
                    deudaTotalTarjetas > 0 ? 'text-coral' : 'text-mint'
                  }`}
                >
                  {formatear(deudaTotalTarjetas)}
                </span>
              </p>
            ) : null
          }
        >
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={onGestionarTarjetas}
              className="text-xs font-semibold text-mint"
            >
              {t('home.gestionarTarjetas')}
            </button>
          </div>

          {cargandoTarjetas && (
            <p className="px-2 text-sm text-text-dim">{t('home.cargandoTarjetas')}</p>
          )}

          {errorTarjetas && <MensajeError>{t('home.errorCargarTarjetas')}</MensajeError>}

          {!cargandoTarjetas && !errorTarjetas && tarjetas.length > 0 && (
            <div className="flex flex-col gap-2">
              {tarjetas.map((tarjeta) => (
                <Tarjeta key={tarjeta.id} {...tarjeta} onClick={() => abrirDetalleTarjeta(tarjeta)} />
              ))}

              <div className="mt-1 flex items-center justify-between rounded-2xl bg-panel shadow-card px-4 py-3">
                <div>
                  <p className="text-xs text-text-dim">{t('home.deudaTarjetasEtiqueta')}</p>
                  <p className={`text-sm font-bold ${deudaTotalTarjetas > 0 ? 'text-coral' : 'text-mint'}`}>
                    {formatear(deudaTotalTarjetas)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-dim">{t('home.cupoDisponibleTarjetasEtiqueta')}</p>
                  <p className="text-sm font-bold text-mint">{formatear(cupoDisponibleTotalTarjetas)}</p>
                </div>
              </div>
            </div>
          )}
        </Acordeon>

        <GastosFijos
          cuentas={cuentas}
          periodo={periodo}
          onMarcarPagado={onMarcarGastoFijoPagado}
          onDesmarcarPagado={onDesmarcarGastoFijoPagado}
          onGestionar={onGestionarGastosFijos}
        />

        <GastosVariables
          version={movimientosVersion}
          periodo={periodo}
          onGestionarCategorias={onGestionarCategorias}
          onAbrirCategoria={abrirDetalleCategoria}
        />
      </div>
    </main>
  )
}

export default Home
