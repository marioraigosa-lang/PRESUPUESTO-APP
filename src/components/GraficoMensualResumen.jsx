import { useIdioma } from '../context/IdiomaContext'

function GraficoMensualResumen({ datos }) {
  const { t } = useIdioma()
  const mesesAbrev = t('comun.mesesAbrev')
  const maximo = Math.max(1, ...datos.flatMap((dato) => [dato.ingresos, dato.gastos]))

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
          {t('resumen.graficoTitulo')}
        </h2>
        <div className="flex items-center gap-3 text-[11px] text-text-dim">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-mint" /> {t('resumen.ingresos')}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" /> {t('resumen.gastos')}
          </span>
        </div>
      </div>

      <div className="flex h-36 items-stretch justify-between gap-1">
        {datos.map((dato) => (
          <div key={dato.mes} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end justify-center gap-0.5">
              <div
                className="w-1.5 rounded-t-sm bg-mint"
                style={{ height: `${Math.max(2, (dato.ingresos / maximo) * 100)}%` }}
                title={`${t('resumen.ingresos')}: ${dato.ingresos}`}
              />
              <div
                className="w-1.5 rounded-t-sm bg-coral"
                style={{ height: `${Math.max(2, (dato.gastos / maximo) * 100)}%` }}
                title={`${t('resumen.gastos')}: ${dato.gastos}`}
              />
            </div>
            <span className="text-[9px] text-text-dim">{mesesAbrev[dato.mes]}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default GraficoMensualResumen
