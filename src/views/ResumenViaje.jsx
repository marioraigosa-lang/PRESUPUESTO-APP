import { useIdioma } from '../context/IdiomaContext'
import { useDatosUsuario } from '../lib/datosUsuario'
import { useConsulta } from '../hooks/useConsulta'
import { textoTrayecto, textoFechas } from '../components/TarjetaViaje'
import { formatearMonto } from '../utils/formatoMoneda'
import { fechaCortaDesdeISO } from '../utils/formatoFecha'
import { resumenPorMonedaYCategoria } from '../utils/resumenViaje'

const DATOS_INICIALES = { categorias: [], gastos: [] }

// Pantalla autosuficiente, igual que DetalleViaje.jsx: carga sus propias
// categorías y gastos con useDatosUsuario + useConsulta. Es el "modo
// resumen" de Viajes.jsx (Fase 5 de "Planifica tus viajes"), a la que se
// llega desde el botón "Ver resumen" del detalle del viaje.
//
// A diferencia del listado de gestión de DetalleViaje.jsx (gastos más
// recientes primero, pensado para editar/eliminar lo último que se
// registró), aquí los gastos se piden en orden ASCENDENTE por fecha: un
// resumen se lee como la crónica del viaje, del primer día al último, no
// como una bandeja de "lo más reciente arriba".
//
// No hay SQL nuevo en esta fase: solo se leen datos que ya existen
// (viajes, categorias_viaje, gastos_viaje). El cálculo de los totales por
// moneda y por categoría vive en utils/resumenViaje.js para poder
// probarlo sin React.
function ResumenViaje({ viaje, onVolver }) {
  const datosUsuario = useDatosUsuario()
  const { seleccionarPropio } = datosUsuario
  const { idioma, t } = useIdioma()

  async function cargarResumenViaje() {
    const [categoriasResultado, gastosResultado] = await Promise.all([
      seleccionarPropio('categorias_viaje', '*').eq('viaje_id', viaje.id),
      seleccionarPropio('gastos_viaje', '*')
        .eq('viaje_id', viaje.id)
        .order('fecha', { ascending: true })
        .order('creado_en', { ascending: true }),
    ])

    if (categoriasResultado.error) throw new Error(categoriasResultado.error.message)
    if (gastosResultado.error) throw new Error(gastosResultado.error.message)

    return { categorias: categoriasResultado.data, gastos: gastosResultado.data }
  }

  const {
    datos: { categorias, gastos },
    cargando,
    error,
  } = useConsulta(cargarResumenViaje, [viaje.id], DATOS_INICIALES)

  const trayecto = textoTrayecto(viaje)
  const resumenMonedas = resumenPorMonedaYCategoria(gastos, categorias)

  return (
    <main className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pb-28">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            aria-label={t('viajes.resumen.volverAria')}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text"
          >
            ←
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-text">{t('viajes.resumen.titulo')}</h1>
            <p className="truncate text-xs text-text-dim">{viaje.nombre}</p>
          </div>
        </header>

        <section className="flex flex-col gap-1 rounded-2xl bg-panel p-4">
          {trayecto && <p className="text-sm font-medium text-text">{trayecto}</p>}
          <p className="text-xs text-text-dim">{textoFechas(viaje, idioma, t)}</p>
        </section>

        {cargando && <p className="px-2 text-sm text-text-dim">{t('viajes.resumen.cargando')}</p>}

        {error && (
          <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {t('viajes.resumen.errorCargar')}
            {error}
          </p>
        )}

        {!cargando && !error && gastos.length === 0 && (
          <p className="rounded-2xl bg-panel p-4 text-sm text-text-dim">{t('viajes.resumen.sinGastos')}</p>
        )}

        {!cargando && !error && gastos.length > 0 && (
          <>
            <section className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-text">{t('viajes.resumen.totalesTitulo')}</h2>

              {resumenMonedas.map(({ moneda, total, categorias: desglose }) => (
                <div key={moneda} className="flex flex-col gap-2 rounded-2xl bg-panel p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-text-dim">{moneda}</p>
                    <p className="text-lg font-semibold text-text">{formatearMonto(total, moneda)}</p>
                  </div>

                  {desglose.length > 1 && (
                    <div className="flex flex-col gap-1 border-t border-panel-2 pt-2">
                      {desglose.map(({ categoria, total: totalCategoria }) => (
                        <div
                          key={categoria?.id ?? 'sin-categoria'}
                          className="flex items-center justify-between gap-2 text-xs text-text-dim"
                        >
                          <span className="truncate">
                            {categoria
                              ? `${categoria.emoji || '🧳'} ${categoria.nombre}`
                              : t('viajes.detalle.gastoSinCategoria')}
                          </span>
                          <span className="shrink-0">{formatearMonto(totalCategoria, moneda)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-text">{t('viajes.resumen.listaTitulo')}</h2>

              {gastos.map((gasto) => {
                const categoria = categorias.find((c) => c.id === gasto.categoria_viaje_id)
                const nombreCategoria = categoria
                  ? `${categoria.emoji || '🧳'} ${categoria.nombre}`
                  : t('viajes.detalle.gastoSinCategoria')

                return (
                  <div key={gasto.id} className="flex items-center gap-3 rounded-2xl bg-panel p-4">
                    <div className="min-w-0 flex-1">
                      {gasto.descripcion && <p className="truncate text-sm text-text">{gasto.descripcion}</p>}
                      <p className="truncate text-xs text-text-dim">
                        {fechaCortaDesdeISO(gasto.fecha, idioma)} · {nombreCategoria}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-text">
                      {formatearMonto(gasto.monto, gasto.moneda)}
                    </p>
                  </div>
                )
              })}
            </section>
          </>
        )}
      </div>
    </main>
  )
}

export default ResumenViaje
