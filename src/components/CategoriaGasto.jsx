import { ChevronRight, Archive } from 'lucide-react'
import { useFormatoMoneda } from '../context/MonedaContext'
import { useIdioma } from '../context/IdiomaContext'
import { calcularProgresoPresupuesto } from '../utils/progresoPresupuesto'
import { resolverIconoCategoria } from '../utils/resolverIconoCategoria'
import IconoCategoria from './IconoCategoria'

// Desde la Fase 2 de "categorías navegables" (ver DetalleCategoria.jsx),
// tocar una categoría abre sus gastos del mes -- por eso ahora es un
// <button> real (no un <div>) con feedback de hover/press y un chevron,
// mismo criterio que ya se usó para <Cuenta> en la Fase 1.
function CategoriaGasto({ categoria, onClick }) {
  const formatear = useFormatoMoneda()
  const { t } = useIdioma()
  const { nombre, color, presupuesto, gastado, archivada_en: archivadaEn } = categoria

  const { tieneTope, excedido, porcentaje } = calcularProgresoPresupuesto(presupuesto, gastado)
  const colorBarra = excedido ? '#f2795b' : color

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('categorias.detalle.abrirDetalleAria', { nombre })}
      className="flex w-full items-center gap-3 rounded-2xl bg-panel-2 px-4 py-3 text-left transition-colors hover:bg-panel active:scale-[0.99]"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}26` }}
      >
        <IconoCategoria nombre={resolverIconoCategoria(categoria)} color={color} size="md" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-sm font-medium text-text">{nombre}</p>
          {/* Solo puede aparecer acá una categoría archivada CON gastos en
              este período (ver el filtro en GastosVariables.jsx) -- este
              badge es lo que le explica al usuario por qué ya no la
              encuentra entre las activas de Gestión de categorías. */}
          {archivadaEn && (
            <span
              className="flex shrink-0 items-center gap-1 rounded-full bg-line px-2 py-0.5 text-[10px] font-semibold text-text-dim"
              title={t('categorias.gestion.archivadaEtiqueta')}
            >
              <Archive className="h-3 w-3" aria-hidden="true" />
              {t('categorias.gestion.archivadaEtiqueta')}
            </span>
          )}
        </div>
        {tieneTope && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${porcentaje}%`, backgroundColor: colorBarra }}
            />
          </div>
        )}
      </div>

      <div className="shrink-0 text-right">
        <p className={`text-sm font-semibold ${excedido ? 'text-coral' : 'text-text'}`}>
          {formatear(gastado)}
        </p>
        {tieneTope && (
          <p className="text-xs text-text-dim">
            {t('home.deMontoPresupuesto', { monto: formatear(presupuesto) })}
          </p>
        )}
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-text-dim" aria-hidden="true" />
    </button>
  )
}

export default CategoriaGasto
