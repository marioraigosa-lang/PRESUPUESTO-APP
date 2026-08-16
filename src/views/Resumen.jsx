import { useState } from 'react'
import AvatarUsuario from '../components/AvatarUsuario'
import AyudaContextual from '../components/AyudaContextual'
import FiltroResumen from '../components/FiltroResumen'
import TarjetasTotalesResumen from '../components/TarjetasTotalesResumen'
import GraficoMensualResumen from '../components/GraficoMensualResumen'
import DesgloseCategoriasResumen from '../components/DesgloseCategoriasResumen'
import { useDatosUsuario } from '../lib/datosUsuario'
import { useConsulta } from '../hooks/useConsulta'
import { useIdioma } from '../context/IdiomaContext'
import { rangoFechasPeriodo } from '../utils/formatoPeriodo'
import { calcularTotalesResumen, agruparGastosPorCategoria, agruparPorMes } from '../utils/resumenCalculos'

const hoy = new Date()

function Resumen() {
  const { seleccionarPropio } = useDatosUsuario()
  const { t } = useIdioma()
  const [anioSeleccionado, setAnioSeleccionado] = useState(hoy.getFullYear())
  const [mesSeleccionado, setMesSeleccionado] = useState(null)

  async function cargarAnios() {
    const { data, error } = await seleccionarPropio('movimientos', 'fecha')
    if (error) throw new Error(error.message)

    const encontrados = new Set(data.map((movimiento) => Number(movimiento.fecha.slice(0, 4))))
    encontrados.add(hoy.getFullYear())
    return [...encontrados].sort((a, b) => b - a)
  }

  const { datos: anios } = useConsulta(cargarAnios, [], [hoy.getFullYear()])

  async function cargarPeriodo() {
    const { desde, hasta } = rangoFechasPeriodo(anioSeleccionado, mesSeleccionado)

    const { data, error } = await seleccionarPropio(
      'movimientos',
      'id, tipo, monto, fecha, categoria:categorias(id, nombre, emoji, color, es_sistema)',
    )
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: true })

    if (error) throw new Error(error.message)

    return data
  }

  const {
    datos: movimientos,
    cargando,
    error,
  } = useConsulta(cargarPeriodo, [anioSeleccionado, mesSeleccionado], [])

  const { totalIngresos, totalGastosFijos, totalGastosVariables, totalGastos, balance } =
    calcularTotalesResumen(movimientos)

  const gastosPorCategoria = agruparGastosPorCategoria(movimientos, totalGastos, t('resumen.sinCategoria'))

  const datosPorMes = agruparPorMes(movimientos)

  const sinMovimientos = !cargando && !error && movimientos.length === 0

  return (
    <main className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pb-28">
        <header className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-semibold text-text">{t('resumen.titulo')}</h1>
              <AyudaContextual
                clave="guia.ayuda.resumenTotales"
                etiqueta={t('guia.ayuda.resumenTotalesAria')}
              />
            </div>
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
