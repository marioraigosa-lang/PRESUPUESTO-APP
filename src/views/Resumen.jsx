import { useEffect, useState } from 'react'
import AvatarUsuario from '../components/AvatarUsuario'
import FiltroResumen from '../components/FiltroResumen'
import TarjetasTotalesResumen from '../components/TarjetasTotalesResumen'
import GraficoMensualResumen from '../components/GraficoMensualResumen'
import DesgloseCategoriasResumen from '../components/DesgloseCategoriasResumen'
import { useDatosUsuario } from '../lib/datosUsuario'
import { useIdioma } from '../context/IdiomaContext'
import { parsearFechaISO } from '../utils/formatoFecha'
import { rangoFechasPeriodo } from '../utils/formatoPeriodo'

const hoy = new Date()

function Resumen() {
  const { seleccionarPropio } = useDatosUsuario()
  const { t } = useIdioma()
  const [anios, setAnios] = useState([hoy.getFullYear()])
  const [anioSeleccionado, setAnioSeleccionado] = useState(hoy.getFullYear())
  const [mesSeleccionado, setMesSeleccionado] = useState(null)

  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function cargarAnios() {
      const { data, error } = await seleccionarPropio('movimientos', 'fecha')

      if (!error && data) {
        const encontrados = new Set(data.map((movimiento) => Number(movimiento.fecha.slice(0, 4))))
        encontrados.add(hoy.getFullYear())
        setAnios([...encontrados].sort((a, b) => b - a))
      }
    }

    cargarAnios()
  }, [])

  useEffect(() => {
    async function cargarPeriodo() {
      setCargando(true)
      setError(null)

      const { desde, hasta } = rangoFechasPeriodo(anioSeleccionado, mesSeleccionado)

      const { data, error: errorRespuesta } = await seleccionarPropio(
        'movimientos',
        'id, tipo, monto, fecha, categoria:categorias(id, nombre, emoji, color, es_sistema)',
      )
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .order('fecha', { ascending: true })

      if (errorRespuesta) {
        setError(errorRespuesta.message)
      } else {
        setMovimientos(data)
      }

      setCargando(false)
    }

    cargarPeriodo()
  }, [anioSeleccionado, mesSeleccionado])

  const totalIngresos = movimientos
    .filter((movimiento) => movimiento.tipo === 'ingreso')
    .reduce((suma, movimiento) => suma + movimiento.monto, 0)

  const movimientosGasto = movimientos.filter((movimiento) => movimiento.tipo === 'gasto')

  const totalGastosFijos = movimientosGasto
    .filter((movimiento) => movimiento.categoria?.es_sistema)
    .reduce((suma, movimiento) => suma + movimiento.monto, 0)

  const totalGastosVariables = movimientosGasto
    .filter((movimiento) => !movimiento.categoria?.es_sistema)
    .reduce((suma, movimiento) => suma + movimiento.monto, 0)

  const totalGastos = totalGastosVariables + totalGastosFijos
  const balance = totalIngresos - totalGastos

  const mapaCategorias = new Map()
  movimientosGasto.forEach((movimiento) => {
    const categoria = movimiento.categoria
    const id = categoria?.id ?? 'sin-categoria'
    const actual = mapaCategorias.get(id) ?? {
      id,
      nombre: categoria?.nombre ?? 'Sin categoría',
      emoji: categoria?.emoji ?? '✨',
      color: categoria?.color ?? '#9db0a6',
      monto: 0,
    }
    actual.monto += movimiento.monto
    mapaCategorias.set(id, actual)
  })

  const gastosPorCategoria = [...mapaCategorias.values()]
    .sort((a, b) => b.monto - a.monto)
    .map((item) => ({
      ...item,
      porcentaje: totalGastos === 0 ? 0 : Math.round((item.monto / totalGastos) * 100),
    }))

  const datosPorMes = Array.from({ length: 12 }, (_, mes) => {
    const movimientosDelMes = movimientos.filter(
      (movimiento) => parsearFechaISO(movimiento.fecha).getMonth() === mes,
    )
    return {
      mes,
      ingresos: movimientosDelMes
        .filter((movimiento) => movimiento.tipo === 'ingreso')
        .reduce((suma, movimiento) => suma + movimiento.monto, 0),
      gastos: movimientosDelMes
        .filter((movimiento) => movimiento.tipo === 'gasto')
        .reduce((suma, movimiento) => suma + movimiento.monto, 0),
    }
  })

  const sinMovimientos = !cargando && !error && movimientos.length === 0

  return (
    <main className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pb-28">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-text">{t('resumen.titulo')}</h1>
            <p className="text-xs text-text-dim">{t('resumen.subtitulo')}</p>
          </div>
          <AvatarUsuario />
        </header>

        <FiltroResumen
          anios={anios}
          anioSeleccionado={anioSeleccionado}
          mesSeleccionado={mesSeleccionado}
          onCambiarAnio={setAnioSeleccionado}
          onCambiarMes={setMesSeleccionado}
        />

        {cargando && <p className="px-2 text-sm text-text-dim">{t('resumen.cargando')}</p>}

        {error && (
          <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {t('resumen.error')}
            {error}
          </p>
        )}

        {!cargando && !error && (
          <>
            <TarjetasTotalesResumen
              totalIngresos={totalIngresos}
              totalGastosVariables={totalGastosVariables}
              totalGastosFijos={totalGastosFijos}
              totalGastos={totalGastos}
              balance={balance}
            />

            {sinMovimientos ? (
              <p className="rounded-2xl bg-panel p-4 text-sm text-text-dim">
                {t('resumen.sinMovimientos')}
              </p>
            ) : (
              <>
                {mesSeleccionado === null && <GraficoMensualResumen datos={datosPorMes} />}
                {gastosPorCategoria.length > 0 && (
                  <DesgloseCategoriasResumen items={gastosPorCategoria} />
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}

export default Resumen
