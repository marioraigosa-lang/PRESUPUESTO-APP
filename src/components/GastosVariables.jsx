import CategoriaGasto from './CategoriaGasto'
import AyudaContextual from './AyudaContextual'
import { useDatosUsuario } from '../lib/datosUsuario'
import { useConsulta } from '../hooks/useConsulta'
import { useFormatoMoneda } from '../context/MonedaContext'
import { useIdioma } from '../context/IdiomaContext'
import { rangoFechasPeriodo } from '../utils/formatoPeriodo'

function GastosVariables({ version, periodo, onGestionarCategorias }) {
  const { seleccionarPropio } = useDatosUsuario()
  const formatear = useFormatoMoneda()
  const { t, tp } = useIdioma()

  async function cargarCategorias() {
    const { desde, hasta } = rangoFechasPeriodo(periodo.anio, periodo.mes, periodo.quincena)

    // La categoría del sistema (gastos fijos) es genérica, solo para los
    // movimientos que crea el checklist de gastos fijos; no es una
    // categoría de presupuesto variable, así que no debe aparecer en esta
    // lista (se identifica por es_sistema, no por nombre, para que
    // funcione igual sin importar el idioma). El gasto de cada categoría
    // se limita a los movimientos cuya fecha caiga en el mes seleccionado
    // (no el histórico completo).
    const [{ data: categoriasData, error: errorCategoriasData }, { data: gastosData, error: errorGastosData }] =
      await Promise.all([
        seleccionarPropio('categorias', 'id, nombre, emoji, color, presupuesto, descripcion').eq(
          'es_sistema',
          false,
        ),
        seleccionarPropio('movimientos', 'categoria_id, monto')
          .eq('tipo', 'gasto')
          .gte('fecha', desde)
          .lte('fecha', hasta),
      ])

    const error = errorCategoriasData || errorGastosData

    if (error) throw new Error(error.message)

    const gastadoPorCategoria = gastosData.reduce((acumulado, movimiento) => {
      if (!movimiento.categoria_id) return acumulado
      acumulado[movimiento.categoria_id] = (acumulado[movimiento.categoria_id] ?? 0) + movimiento.monto
      return acumulado
    }, {})

    return categoriasData.map((categoria) => ({
      ...categoria,
      gastado: gastadoPorCategoria[categoria.id] ?? 0,
    }))
  }

  const {
    datos: categorias,
    cargando: cargandoCategorias,
    error: errorCategorias,
  } = useConsulta(cargarCategorias, [version, periodo.anio, periodo.mes, periodo.quincena], [])

  const totalGastado = categorias.reduce((suma, categoria) => suma + categoria.gastado, 0)
  const categoriasConTope = categorias.filter((categoria) => Boolean(categoria.presupuesto))
  const totalTope = categoriasConTope.reduce((suma, categoria) => suma + categoria.presupuesto, 0)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
            {t('home.gastosVariablesTitulo')}
          </h2>
          <AyudaContextual clave="guia.ayuda.gastosVariables" etiqueta={t('guia.ayuda.gastosVariablesAria')} />
        </div>
        <button
          type="button"
          onClick={onGestionarCategorias}
          className="text-xs font-semibold text-mint"
        >
          {t('home.gestionarCategorias')}
        </button>
      </div>

      {cargandoCategorias && (
        <p className="px-2 text-sm text-text-dim">{t('home.cargandoCategorias')}</p>
      )}

      {errorCategorias && (
        <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {t('home.errorCargarCategorias')}
          {errorCategorias}
        </p>
      )}

      {!cargandoCategorias && !errorCategorias && (
        <div className="flex flex-col gap-2 rounded-2xl bg-panel p-2">
          {categorias.map((categoria) => (
            <CategoriaGasto key={categoria.id} categoria={categoria} />
          ))}

          {categorias.length > 0 && (
            <div className="mt-1 flex flex-col gap-2 rounded-2xl bg-panel-2 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text">{t('home.totalGastado')}</p>
                <p className="text-base font-bold text-mint">{formatear(totalGastado)}</p>
              </div>
              {totalTope > 0 && (
                <p className="text-xs text-text-dim">
                  {t('home.topesResumen', {
                    monto: formatear(totalTope),
                    conTope: categoriasConTope.length,
                    total: categorias.length,
                    palabra: tp('home.categoriaContador', categorias.length),
                  })}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default GastosVariables
