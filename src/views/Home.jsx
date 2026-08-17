import { useState } from 'react'
import Encabezado from '../components/Encabezado'
import SelectorPeriodo from '../components/SelectorPeriodo'
import TarjetaSaldo from '../components/TarjetaSaldo'
import Cuenta from '../components/Cuenta'
import GastosFijos from '../components/GastosFijos'
import GastosVariables from '../components/GastosVariables'
import MovimientosRecientes from '../components/MovimientosRecientes'
import { useDatosUsuario } from '../lib/datosUsuario'
import { useConsulta } from '../hooks/useConsulta'
import { useFormatoMoneda } from '../context/MonedaContext'
import { useIdioma } from '../context/IdiomaContext'
import { textoPeriodo, rangoFechasPeriodo } from '../utils/formatoPeriodo'
import MensajeError from '../components/ui/MensajeError'

const hoy = new Date()

function Home({
  cuentas,
  cargandoCuentas,
  errorCuentas,
  movimientosVersion,
  onGestionarCuentas,
  onGestionarCategorias,
  onGestionarGastosFijos,
  onMarcarGastoFijoPagado,
  onDesmarcarGastoFijoPagado,
  onEditarMovimiento,
  onEliminarMovimiento,
}) {
  const { seleccionarPropio } = useDatosUsuario()
  const formatear = useFormatoMoneda()
  const { idioma, t } = useIdioma()
  const [periodo, setPeriodo] = useState({
    mes: hoy.getMonth(),
    anio: hoy.getFullYear(),
    quincena: 'completo',
  })

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

  const total = cuentas.reduce((suma, cuenta) => suma + cuenta.saldo, 0)

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

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
              {t('home.misCuentas')}
            </h2>
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
                <Cuenta key={cuenta.id} {...cuenta} />
              ))}

              <div className="mt-1 flex items-center justify-between rounded-2xl bg-mint/10 px-4 py-3">
                <p className="text-sm font-semibold text-mint">{t('home.totalDisponible')}</p>
                <p className="text-sm font-bold text-mint">{formatear(total)}</p>
              </div>
            </div>
          )}
        </section>

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
        />

        <MovimientosRecientes
          version={movimientosVersion}
          periodo={periodo}
          onEditarMovimiento={onEditarMovimiento}
          onEliminarMovimiento={onEliminarMovimiento}
        />
      </div>
    </main>
  )
}

export default Home
