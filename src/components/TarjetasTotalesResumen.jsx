import { useFormatoMoneda } from '../context/MonedaContext'
import { useIdioma } from '../context/IdiomaContext'

function TarjetasTotalesResumen({
  totalIngresos,
  totalGastosVariables,
  totalGastosFijos,
  totalGastos,
  balance,
}) {
  const formatear = useFormatoMoneda()
  const { t } = useIdioma()
  const esPositivo = balance >= 0

  return (
    <section className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-panel p-4">
          <p className="text-xs text-text-dim">{t('resumen.ingresos')}</p>
          <p className="mt-1 text-xl font-bold text-mint">{formatear(totalIngresos)}</p>
        </div>

        <div className="rounded-2xl bg-panel p-4">
          <p className="text-xs text-text-dim">{t('resumen.gastos')}</p>
          <p className="mt-1 text-xl font-bold text-coral">{formatear(totalGastos)}</p>
          <div className="mt-2 flex flex-col gap-0.5 text-[11px] text-text-dim">
            <p>{t('resumen.fijos', { monto: formatear(totalGastosFijos) })}</p>
            <p>{t('resumen.variables', { monto: formatear(totalGastosVariables) })}</p>
          </div>
        </div>
      </div>

      <div
        className={`flex items-center justify-between rounded-2xl px-4 py-3 ${
          esPositivo ? 'bg-mint/10' : 'bg-coral/10'
        }`}
      >
        <p className={`text-sm font-semibold ${esPositivo ? 'text-mint' : 'text-coral'}`}>
          {t('resumen.balancePeriodo')}
        </p>
        <p className={`text-sm font-bold ${esPositivo ? 'text-mint' : 'text-coral'}`}>
          {esPositivo ? '+' : '−'}
          {formatear(Math.abs(balance))}
        </p>
      </div>
    </section>
  )
}

export default TarjetasTotalesResumen
