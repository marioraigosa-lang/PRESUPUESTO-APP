import { useMemo, useState } from 'react'
import { useIdioma } from '../context/IdiomaContext'
import { useFormatoMoneda, useMoneda } from '../context/MonedaContext'
import { configMoneda } from '../utils/monedas'
import { limpiarEntradaMonto, formatearEntradaMonto } from '../utils/inputMoneda'
import AyudaContextual from '../components/AyudaContextual'
import BotonVolver from '../components/ui/BotonVolver'
import MensajeError from '../components/ui/MensajeError'

function sanitizarDecimal(valor) {
  const limpio = valor.replace(/[^\d.]/g, '')
  const partes = limpio.split('.')
  return partes.length > 2 ? `${partes[0]}.${partes.slice(1).join('')}` : limpio
}

function CalculadoraAhorro({ onVolver }) {
  const { t } = useIdioma()
  const formatear = useFormatoMoneda()
  const { moneda } = useMoneda()
  const { simbolo, decimales } = configMoneda(moneda)
  const [aporteMensual, setAporteMensual] = useState('')
  const [montoInicial, setMontoInicial] = useState('')
  const [plazo, setPlazo] = useState('')
  const [unidadPlazo, setUnidadPlazo] = useState('meses')
  const [tasaEA, setTasaEA] = useState('')

  const { error, resultado } = useMemo(() => {
    const aporte = aporteMensual ? Number(aporteMensual) : 0
    const inicial = montoInicial ? Number(montoInicial) : 0

    if (aporte <= 0 && inicial <= 0) {
      return { error: t('calculadoraAhorro.errorSinAporte'), resultado: null }
    }
    if (!plazo || Number(plazo) <= 0) {
      const unidad =
        unidadPlazo === 'años'
          ? t('calculadoraAhorro.unidadAniosTexto')
          : t('calculadoraAhorro.unidadMesesTexto')
      return { error: t('calculadoraAhorro.errorPlazoVacio', { unidad }), resultado: null }
    }
    if (tasaEA === '' || Number(tasaEA) < 0) {
      return { error: t('calculadoraAhorro.errorTasaVacia'), resultado: null }
    }
    if (Number(tasaEA) > 100) {
      return { error: t('calculadoraAhorro.errorTasaExcesiva'), resultado: null }
    }

    const n = unidadPlazo === 'años' ? Number(plazo) * 12 : Number(plazo)
    const ea = Number(tasaEA) / 100
    const i = Math.pow(1 + ea, 1 / 12) - 1

    // Valor futuro de una anualidad ordinaria (aporte al FINAL de cada
    // mes): FV = aporte * ((1+i)^n - 1) / i. Con tasa 0% se calcula aparte
    // (sería aporte * n) para no dividir por cero.
    const valorFuturoAportes = i === 0 ? aporte * n : aporte * ((Math.pow(1 + i, n) - 1) / i)
    // El monto inicial (si lo hay) crece aparte con interés compuesto normal.
    const valorFuturoInicial = inicial * Math.pow(1 + i, n)

    const totalAcumulado = valorFuturoAportes + valorFuturoInicial

    if (!Number.isFinite(totalAcumulado)) {
      return {
        error: t('calculadoraAhorro.errorCalculo'),
        resultado: null,
      }
    }

    const totalAportado = aporte * n + inicial
    const totalIntereses = totalAcumulado - totalAportado

    return { error: null, resultado: { totalAcumulado, totalAportado, totalIntereses } }
  }, [aporteMensual, montoInicial, plazo, unidadPlazo, tasaEA])

  return (
    <main className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pb-28">
        <header className="flex items-center gap-3">
          <BotonVolver onClick={onVolver} ariaLabel={t('calculadoraAhorro.volverAria')} />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-semibold text-text">{t('calculadoraAhorro.titulo')}</h1>
              <AyudaContextual clave="guia.ayuda.calcAhorroInteres" etiqueta={t('guia.ayuda.calcAhorroInteresAria')} />
            </div>
            <p className="text-xs text-text-dim">{t('calculadoraAhorro.subtitulo')}</p>
          </div>
        </header>

        <div className="flex flex-col gap-4 rounded-2xl bg-panel shadow-card p-4">
          <div>
            <label htmlFor="aporteMensual" className="mb-1 block text-xs text-text-dim">
              {t('calculadoraAhorro.aporteLabel')}
            </label>
            <div className="flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3">
              <span className="text-xl font-semibold text-text-dim">{simbolo}</span>
              <input
                id="aporteMensual"
                type="text"
                inputMode={decimales > 0 ? 'decimal' : 'numeric'}
                placeholder="0"
                value={formatearEntradaMonto(aporteMensual, moneda)}
                onChange={(evento) => setAporteMensual(limpiarEntradaMonto(evento.target.value, moneda))}
                className="w-full bg-transparent text-xl font-semibold text-text outline-none placeholder:text-text-dim"
              />
            </div>
          </div>

          <div>
            <label htmlFor="montoInicial" className="mb-1 block text-xs text-text-dim">
              {t('calculadoraAhorro.montoInicialLabel')}
            </label>
            <div className="flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3">
              <span className="text-xl font-semibold text-text-dim">{simbolo}</span>
              <input
                id="montoInicial"
                type="text"
                inputMode={decimales > 0 ? 'decimal' : 'numeric'}
                placeholder="0"
                value={formatearEntradaMonto(montoInicial, moneda)}
                onChange={(evento) => setMontoInicial(limpiarEntradaMonto(evento.target.value, moneda))}
                className="w-full bg-transparent text-xl font-semibold text-text outline-none placeholder:text-text-dim"
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs text-text-dim">{t('calculadoraAhorro.plazoLabel')}</p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder={
                  unidadPlazo === 'años'
                    ? t('calculadoraAhorro.plazoPlaceholderAnios')
                    : t('calculadoraAhorro.plazoPlaceholderMeses')
                }
                value={plazo}
                onChange={(evento) => setPlazo(evento.target.value.replace(/\D/g, ''))}
                className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
              />
              <div className="flex shrink-0 gap-1 rounded-full bg-panel-2 p-1">
                <button
                  type="button"
                  onClick={() => setUnidadPlazo('meses')}
                  className={`rounded-full px-3 py-2 text-xs font-medium transition-colors ${
                    unidadPlazo === 'meses' ? 'bg-mint text-bg' : 'text-text-dim'
                  }`}
                >
                  {t('calculadoraAhorro.unidadMesesLabel')}
                </button>
                <button
                  type="button"
                  onClick={() => setUnidadPlazo('años')}
                  className={`rounded-full px-3 py-2 text-xs font-medium transition-colors ${
                    unidadPlazo === 'años' ? 'bg-mint text-bg' : 'text-text-dim'
                  }`}
                >
                  {t('calculadoraAhorro.unidadAniosLabel')}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="tasaAhorro" className="mb-1 block text-xs text-text-dim">
              {t('calculadoraAhorro.tasaLabel')}
            </label>
            <div className="flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3">
              <input
                id="tasaAhorro"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={tasaEA}
                onChange={(evento) => setTasaEA(sanitizarDecimal(evento.target.value))}
                className="w-full bg-transparent text-xl font-semibold text-text outline-none placeholder:text-text-dim"
              />
              <span className="text-xl font-semibold text-text-dim">%</span>
            </div>
          </div>
        </div>

        <MensajeError>{error}</MensajeError>

        {resultado && (
          <div className="flex flex-col gap-3 rounded-2xl bg-panel shadow-card p-4">
            <div className="rounded-2xl bg-mint/10 px-4 py-3 text-center">
              <p className="text-xs text-text-dim">{t('calculadoraAhorro.totalAcumuladoLabel')}</p>
              <p className="text-2xl font-bold text-mint">
                {formatear(Math.round(resultado.totalAcumulado))}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-text-dim">{t('calculadoraAhorro.totalAportadoLabel')}</p>
              <p className="text-sm font-semibold text-text">
                {formatear(Math.round(resultado.totalAportado))}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-text-dim">{t('calculadoraAhorro.interesesGanadosLabel')}</p>
              <p className="text-sm font-semibold text-gold">
                {formatear(Math.round(resultado.totalIntereses))}
              </p>
            </div>
          </div>
        )}

        <p className="rounded-2xl bg-panel-2 px-4 py-3 text-xs leading-relaxed text-text-dim">
          {t('calculadoraAhorro.notaEducativa')}
        </p>
      </div>
    </main>
  )
}

export default CalculadoraAhorro
