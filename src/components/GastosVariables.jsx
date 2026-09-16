import CategoriaGasto from './CategoriaGasto'
import AyudaContextual from './AyudaContextual'
import { useDatosUsuario } from '../lib/datosUsuario'
import { useConsulta } from '../hooks/useConsulta'
import { useFormatoMoneda } from '../context/MonedaContext'
import { useIdioma } from '../context/IdiomaContext'
import { rangoFechasPeriodo } from '../utils/formatoPeriodo'
import { colorSemaforoLlenado } from '../utils/colorSemaforo'
import MensajeError from './ui/MensajeError'
import Acordeon from './ui/Acordeon'
import BarraProgreso from './ui/BarraProgreso'
import { calcularResumenGastosVariables } from '../utils/resumenGastosVariables'

function GastosVariables({ version, periodo, onGestionarCategorias, onAbrirCategoria }) {
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
        seleccionarPropio(
          'categorias',
          'id, nombre, emoji, icono, color, presupuesto, descripcion, archivada_en',
        ).eq('es_sistema', false),
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

    // El corazón del archivado de categorías (a diferencia de tarjetas, que
    // se ocultan siempre): una categoría ACTIVA se muestra sin condiciones;
    // una ARCHIVADA solo se muestra si tiene algo gastado en ESTE período --
    // así sigue viéndose en el mes donde de verdad se usó, pero desaparece
    // en cualquier mes (como el actual) donde ya no tiene movimientos. Este
    // filtro no puede vivir en una vista SQL fija (como sí lo hace
    // tarjetas_con_deuda): depende del rango de fechas que esta pantalla
    // esté mirando en cada momento, así que se resuelve acá, ya con
    // "gastadoPorCategoria" calculado para el período elegido. Ver plan de
    // archivado de categorías / sql/supabase_archivar_categorias.sql.
    return categoriasData
      .map((categoria) => ({
        ...categoria,
        gastado: gastadoPorCategoria[categoria.id] ?? 0,
      }))
      .filter((categoria) => !categoria.archivada_en || categoria.gastado > 0)
  }

  const {
    datos: categorias,
    cargando: cargandoCategorias,
    error: errorCategorias,
  } = useConsulta(cargarCategorias, [version, periodo.anio, periodo.mes, periodo.quincena], [])

  const { totalGastado, totalTope, cantidadConTope } = calcularResumenGastosVariables(categorias)

  // Porcentaje gastado sobre el presupuesto TOTAL (suma de todas las
  // categorías con tope) -- sin capar en 100 a propósito: BarraProgreso topa
  // el ANCHO visual solo, el número se muestra tal cual (para que se note
  // cuánto se excedió, ej. "134%"). Semáforo "más lleno = peor" (ver
  // colorSemaforo.js): <70% mint, 70-90% gold, >90% coral -- excedidoTotal
  // (>100%) cae ahí mismo, ya no hace falta usarlo aparte para el color.
  const porcentajeGastado = totalTope > 0 ? Math.round((totalGastado / totalTope) * 100) : null

  // El mini-resumen del header colapsado se oculta mientras carga, si falla,
  // o si no hay ninguna categoría -- mismo criterio que en GastosFijos.jsx.
  // Si hay categorías pero ninguna tiene presupuesto asignado (totalTope
  // === 0), no hay contra qué medir un % -- se cae al texto simple de
  // siempre (solo lo gastado, sin barra) en vez de dividir por cero.
  const resumenColapsado =
    !cargandoCategorias && !errorCategorias && categorias.length > 0 ? (
      porcentajeGastado !== null ? (
        <BarraProgreso
          porcentaje={porcentajeGastado}
          color={colorSemaforoLlenado(porcentajeGastado)}
          etiquetaAria={t('home.gastadoPorcentajeAria', { porcentaje: porcentajeGastado })}
        />
      ) : (
        <p className="flex items-baseline gap-1.5">
          <span className="text-xs text-text-dim">{t('home.gastadoEtiqueta')}</span>
          <span className="truncate text-sm font-semibold text-mint">{formatear(totalGastado)}</span>
        </p>
      )
    ) : null

  return (
    <Acordeon titulo={t('home.gastosVariablesTitulo')} resumenColapsado={resumenColapsado}>
      <div className="flex items-center justify-between">
        <AyudaContextual clave="guia.ayuda.gastosVariables" etiqueta={t('guia.ayuda.gastosVariablesAria')} />
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

      {errorCategorias && <MensajeError>{t('home.errorCargarCategorias')}</MensajeError>}

      {!cargandoCategorias && !errorCategorias && (
        <div className="flex flex-col gap-2 rounded-2xl bg-panel shadow-card p-2">
          {categorias.map((categoria) => (
            <CategoriaGasto
              key={categoria.id}
              categoria={categoria}
              onClick={() => onAbrirCategoria(categoria)}
            />
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
                    conTope: cantidadConTope,
                    total: categorias.length,
                    palabra: tp('home.categoriaContador', categorias.length),
                  })}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Acordeon>
  )
}

export default GastosVariables
