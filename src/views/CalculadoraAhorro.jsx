import { useMemo, useState } from 'react'
import { useFormatoMoneda } from '../context/MonedaContext'

function sanitizarDecimal(valor) {
  const limpio = valor.replace(/[^\d.]/g, '')
  const partes = limpio.split('.')
  return partes.length > 2 ? `${partes[0]}.${partes.slice(1).join('')}` : limpio
}

function CalculadoraAhorro({ onVolver }) {
  const formatear = useFormatoMoneda()
  const [aporteMensual, setAporteMensual] = useState('')
  const [montoInicial, setMontoInicial] = useState('')
  const [plazo, setPlazo] = useState('')
  const [unidadPlazo, setUnidadPlazo] = useState('meses')
  const [tasaEA, setTasaEA] = useState('')

  const { error, resultado } = useMemo(() => {
    const aporte = aporteMensual ? Number(aporteMensual) : 0
    const inicial = montoInicial ? Number(montoInicial) : 0

    if (aporte <= 0 && inicial <= 0) {
      return { error: 'Ingresa un aporte mensual o un monto inicial', resultado: null }
    }
    if (!plazo || Number(plazo) <= 0) {
      return { error: `Ingresa el plazo en ${unidadPlazo}`, resultado: null }
    }
    if (tasaEA === '' || Number(tasaEA) < 0) {
      return { error: 'Ingresa la tasa de rendimiento (% E.A.)', resultado: null }
    }
    if (Number(tasaEA) > 100) {
      return { error: 'Ingresa una tasa razonable (hasta 100% E.A.)', resultado: null }
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
        error: 'No se pudo calcular con estos datos. Revisa el aporte, la tasa y el plazo.',
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
          <button
            type="button"
            onClick={onVolver}
            aria-label="Volver"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-semibold text-text">Ahorro con interés compuesto</h1>
            <p className="text-xs text-text-dim">Proyecta cuánto acumularías ahorrando cada mes</p>
          </div>
        </header>

        <div className="flex flex-col gap-4 rounded-2xl bg-panel p-4">
          <div>
            <label htmlFor="aporteMensual" className="mb-1 block text-xs text-text-dim">
              Aporte mensual
            </label>
            <div className="flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3">
              <span className="text-xl font-semibold text-text-dim">$</span>
              <input
                id="aporteMensual"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={aporteMensual ? new Intl.NumberFormat('es-CO').format(Number(aporteMensual)) : ''}
                onChange={(evento) => setAporteMensual(evento.target.value.replace(/\D/g, ''))}
                className="w-full bg-transparent text-xl font-semibold text-text outline-none placeholder:text-text-dim"
              />
            </div>
          </div>

          <div>
            <label htmlFor="montoInicial" className="mb-1 block text-xs text-text-dim">
              Monto inicial (opcional)
            </label>
            <div className="flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3">
              <span className="text-xl font-semibold text-text-dim">$</span>
              <input
                id="montoInicial"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={montoInicial ? new Intl.NumberFormat('es-CO').format(Number(montoInicial)) : ''}
                onChange={(evento) => setMontoInicial(evento.target.value.replace(/\D/g, ''))}
                className="w-full bg-transparent text-xl font-semibold text-text outline-none placeholder:text-text-dim"
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs text-text-dim">Plazo</p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder={unidadPlazo === 'años' ? 'Ej: 5' : 'Ej: 24'}
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
                  Meses
                </button>
                <button
                  type="button"
                  onClick={() => setUnidadPlazo('años')}
                  className={`rounded-full px-3 py-2 text-xs font-medium transition-colors ${
                    unidadPlazo === 'años' ? 'bg-mint text-bg' : 'text-text-dim'
                  }`}
                >
                  Años
                </button>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="tasaAhorro" className="mb-1 block text-xs text-text-dim">
              Tasa de rendimiento (% E.A.)
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

        {error && (
          <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-coral">{error}</p>
        )}

        {resultado && (
          <div className="flex flex-col gap-3 rounded-2xl bg-panel p-4">
            <div className="rounded-2xl bg-mint/10 px-4 py-3 text-center">
              <p className="text-xs text-text-dim">Total acumulado</p>
              <p className="text-2xl font-bold text-mint">
                {formatear(Math.round(resultado.totalAcumulado))}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-text-dim">Total aportado por ti</p>
              <p className="text-sm font-semibold text-text">
                {formatear(Math.round(resultado.totalAportado))}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-text-dim">Intereses ganados</p>
              <p className="text-sm font-semibold text-gold">
                {formatear(Math.round(resultado.totalIntereses))}
              </p>
            </div>
          </div>
        )}

        <p className="rounded-2xl bg-panel-2 px-4 py-3 text-xs leading-relaxed text-text-dim">
          Asume que el aporte se hace al final de cada mes y que el rendimiento se capitaliza
          mensualmente a partir de la tasa E.A. ingresada. Cálculo estimado con fines educativos:
          los productos reales pueden tener condiciones distintas. Consulta las condiciones exactas
          con tu entidad financiera.
        </p>
      </div>
    </main>
  )
}

export default CalculadoraAhorro
