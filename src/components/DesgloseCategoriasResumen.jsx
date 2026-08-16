import { useFormatoMoneda } from '../context/MonedaContext'
import { useIdioma } from '../context/IdiomaContext'
import AyudaContextual from './AyudaContextual'

function DesgloseCategoriasResumen({ items }) {
  const formatear = useFormatoMoneda()
  const { t } = useIdioma()
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
          {t('resumen.categoriasTitulo')}
        </h2>
        <AyudaContextual clave="guia.ayuda.resumenDesglose" etiqueta={t('guia.ayuda.resumenDesgloseAria')} />
      </div>

      <div className="flex flex-col gap-2 rounded-2xl bg-panel p-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-2xl bg-panel-2 px-4 py-3"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
              style={{ backgroundColor: `${item.color}26` }}
            >
              {item.emoji}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text">{item.nombre}</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${item.porcentaje}%`, backgroundColor: item.color }}
                />
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold text-text">{formatear(item.monto)}</p>
              <p className="text-xs text-text-dim">{item.porcentaje}%</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default DesgloseCategoriasResumen
