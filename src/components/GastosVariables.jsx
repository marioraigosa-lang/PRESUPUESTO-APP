import CategoriaGasto from './CategoriaGasto'
import AyudaContextual from './AyudaContextual'
import { useDatosUsuario } from '../lib/datosUsuario'
import { useConsulta } from '../hooks/useConsulta'
import { useFormatoMoneda } from '../context/MonedaContext'
import { useIdioma } from '../context/IdiomaContext'
import { rangoFechasPeriodo } from '../utils/formatoPeriodo'
import MensajeError from './ui/MensajeError'
import Acordeon from './ui/Acordeon'
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

  const { totalGastado, totalTope, excedidoTotal, cantidadConTope } =
    calcularResumenGastosVariables(categorias)

  // El mini-resumen del header colapsado se oculta mientras carga, si falla,
  // o si no hay ninguna categoría -- mismo criterio que en GastosFijos.jsx.
  // Si hay categorías pero ninguna tiene presupuesto asignado, no tiene
  // sentido un "$Y / $0" -- se muestra solo lo gastado, sin el "/ $Z". El
  // valor se pinta en coral solo si se excedió el presupuesto TOTAL (suma de
  // todas las categorías con tope) -- no hay "excedido" que mostrar cuando no
  // hay ningún presupuesto definido.
  const resumenColapsado =
    !cargandoCategorias && !errorCategorias && categorias.length > 0 ? (
      <p className="flex items-baseline gap-1.5">
        <span className="text-xs text-text-dim">{t('home.gastadoEtiqueta')}</span>
        <span className={`truncate text-sm font-semibold ${excedidoTotal ? 'text-coral' : 'text-mint'}`}>
          {totalTope > 0 ? `${formatear(totalGastado)} / ${formatear(totalTope)}` : formatear(totalGastado)}
        </span>
      </p>
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
