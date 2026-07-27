import { useFormatoMoneda } from '../context/MonedaContext'
import { useIdioma } from '../context/IdiomaContext'

function CategoriaGasto({ categoria }) {
  const formatear = useFormatoMoneda()
  const { t } = useIdioma()
  const { nombre, emoji, color, presupuesto, gastado } = categoria

  const tieneTope = Boolean(presupuesto)
  const excedido = tieneTope && gastado > presupuesto
  const porcentaje = tieneTope ? Math.min(100, Math.round((gastado / presupuesto) * 100)) : 0
  const colorBarra = excedido ? '#f2795b' : color

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-panel-2 px-4 py-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
        style={{ backgroundColor: `${color}26` }}
      >
        {emoji}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">{nombre}</p>
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
    </div>
  )
}

export default CategoriaGasto
