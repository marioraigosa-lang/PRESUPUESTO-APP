import { useMemo, useState } from 'react'
import { useIdioma } from '../context/IdiomaContext'
import { useFormatoMoneda, useMoneda } from '../context/MonedaContext'
import { configMoneda } from '../utils/monedas'
import { limpiarEntradaMonto, formatearEntradaMonto } from '../utils/inputMoneda'
import AyudaContextual from '../components/AyudaContextual'
import BotonVolver from '../components/ui/BotonVolver'
import MensajeError from '../components/ui/MensajeError'

// Plazos típicos en Colombia, de crédito de consumo a crédito hipotecario.
// Solo se guarda el número de meses -- la etiqueta ("12 meses (1 año)") se
// arma en el render con tp(), porque "mes/meses" y "año/años" cambian de
// singular a plural según el idioma activo (y el de 12 meses es 1 año,
// singular).
const PLAZOS = [12, 24, 36, 48, 60, 72, 84, 120, 180, 240]
const PLAZO_VIVIENDA_MESES = 240

// Deja pasar dígitos y un solo punto decimal (para tasas como "24.5").
function sanitizarDecimal(valor) {
  const limpio = valor.replace(/[^\d.]/g, '')
  const partes = limpio.split('.')
  return partes.length > 2 ? `${partes[0]}.${partes.slice(1).join('')}` : limpio
}

function CalculadoraCuotaCredito({ onVolver }) {
  const { t, tp } = useIdioma()
  const formatear = useFormatoMoneda()
  const { moneda } = useMoneda()
  const { simbolo, decimales } = configMoneda(moneda)
  const [monto, setMonto] = useState('')
  const [tasaEA, setTasaEA] = useState('')
  const [plazoMeses, setPlazoMeses] = useState(String(PLAZOS[4]))

  // Todo el cálculo es reactivo (sin botón "Calcular"): apenas cambian los
  // campos, se recalcula. No hay nada que guardar, así que no hace falta
  // un paso explícito de envío.
  const { error, resultado } = useMemo(() => {
    if (!monto || Number(monto) <= 0) {
      return { error: t('calculadoraCredito.errorMontoVacio'), resultado: null }
    }
    if (tasaEA === '' || Number(tasaEA) < 0) {
      return { error: t('calculadoraCredito.errorTasaVacia'), resultado: null }
    }
    if (Number(tasaEA) > 300) {
      return { error: t('calculadoraCredito.errorTasaExcesiva'), resultado: null }
    }

    const P = Number(monto)
    const n = Number(plazoMeses)
    const ea = Number(tasaEA) / 100
    // Los bancos en Colombia cotizan la tasa como Efectivo Anual (E.A.); el
    // sistema francés necesita la tasa PERIÓDICA (mensual), así que se
    // convierte con la fórmula estándar de tasas equivalentes:
    //   i_mensual = (1 + i_anual)^(1/12) - 1
    const i = Math.pow(1 + ea, 1 / 12) - 1

    // Cuota fija del sistema francés: cuota = P * i / (1 - (1+i)^-n).
    // Con tasa 0% la fórmula divide por cero, así que ese caso se calcula
    // aparte como una simple división en partes iguales.
    const cuota = i === 0 ? P / n : (P * i) / (1 - Math.pow(1 + i, -n))

    if (!Number.isFinite(cuota) || cuota <= 0) {
      return {
        error: t('calculadoraCredito.errorCalculo'),
        resultado: null,
      }
    }

    const totalPagado = cuota * n
    const totalIntereses = totalPagado - P

    return { error: null, resultado: { cuota, totalPagado, totalIntereses, tasaMensual: i } }
  }, [monto, tasaEA, plazoMeses])

  return (
    <main className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pb-28">
        <header className="flex items-center gap-3">
          <BotonVolver onClick={onVolver} ariaLabel={t('calculadoraCredito.volverAria')} />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-semibold text-text">{t('calculadoraCredito.titulo')}</h1>
              <AyudaContextual clave="guia.ayuda.calcCuota" etiqueta={t('guia.ayuda.calcCuotaAria')} />
            </div>
            <p className="text-xs text-text-dim">{t('calculadoraCredito.subtitulo')}</p>
          </div>
        </header>

        <div className="flex flex-col gap-4 rounded-2xl bg-panel shadow-card p-4">
          <div>
            <label htmlFor="montoCredito" className="mb-1 block text-xs text-text-dim">
              {t('calculadoraCredito.montoLabel')}
            </label>
            <div className="flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3">
              <span className="text-xl font-semibold text-text-dim">{simbolo}</span>
              <input
                id="montoCredito"
                type="text"
                inputMode={decimales > 0 ? 'decimal' : 'numeric'}
                placeholder="0"
                value={formatearEntradaMonto(monto, moneda)}
                onChange={(evento) => setMonto(limpiarEntradaMonto(evento.target.value, moneda))}
                className="w-full bg-transparent text-xl font-semibold text-text outline-none placeholder:text-text-dim"
              />
            </div>
          </div>

          <div>
            <label htmlFor="tasaEA" className="mb-1 block text-xs text-text-dim">
              {t('calculadoraCredito.tasaLabel')}
            </label>
            <div className="flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3">
              <input
                id="tasaEA"
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

          <div>
            <label htmlFor="plazoCredito" className="mb-1 block text-xs text-text-dim">
              {t('calculadoraCredito.plazoLabel')}
            </label>
            <select
              id="plazoCredito"
              value={plazoMeses}
              onChange={(evento) => setPlazoMeses(evento.target.value)}
              className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none"
            >
              {PLAZOS.map((meses) => (
                <option key={meses} value={meses}>
                  {tp('calculadoraCredito.plazoMeses', meses)} ({tp('calculadoraCredito.plazoAnios', meses / 12)}
                  {meses === PLAZO_VIVIENDA_MESES ? `, ${t('calculadoraCredito.plazoVivienda')}` : ''})
                </option>
              ))}
            </select>
          </div>
        </div>

        <MensajeError>{error}</MensajeError>

        {resultado && (
          <div className="flex flex-col gap-3 rounded-2xl bg-panel shadow-card p-4">
            <div className="rounded-2xl bg-mint/10 px-4 py-3 text-center">
              <p className="text-xs text-text-dim">{t('calculadoraCredito.cuotaMensualLabel')}</p>
              <p className="text-2xl font-bold text-mint">{formatear(Math.round(resultado.cuota))}</p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-text-dim">
                {tp('calculadoraCredito.totalAPagar', Number(plazoMeses))}
              </p>
              <p className="text-sm font-semibold text-text">
                {formatear(Math.round(resultado.totalPagado))}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-text-dim">{t('calculadoraCredito.totalInteresesLabel')}</p>
              <p className="text-sm font-semibold text-coral">
                {formatear(Math.round(resultado.totalIntereses))}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-line pt-3">
              <p className="text-xs text-text-dim">{t('calculadoraCredito.tasaMensualLabel')}</p>
              <p className="text-xs text-text-dim">{(resultado.tasaMensual * 100).toFixed(3)}%</p>
            </div>
          </div>
        )}

        <p className="rounded-2xl bg-panel-2 px-4 py-3 text-xs leading-relaxed text-text-dim">
          {t('calculadoraCredito.notaEducativa')}
        </p>
      </div>
    </main>
  )
}

export default CalculadoraCuotaCredito
