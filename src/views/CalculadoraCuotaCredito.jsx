import { useMemo, useState } from 'react'
import { useFormatoMoneda } from '../context/MonedaContext'

// Plazos típicos en Colombia, de crédito de consumo a crédito hipotecario.
const PLAZOS = [
  { meses: 12, etiqueta: '12 meses (1 año)' },
  { meses: 24, etiqueta: '24 meses (2 años)' },
  { meses: 36, etiqueta: '36 meses (3 años)' },
  { meses: 48, etiqueta: '48 meses (4 años)' },
  { meses: 60, etiqueta: '60 meses (5 años)' },
  { meses: 72, etiqueta: '72 meses (6 años)' },
  { meses: 84, etiqueta: '84 meses (7 años)' },
  { meses: 120, etiqueta: '120 meses (10 años)' },
  { meses: 180, etiqueta: '180 meses (15 años)' },
  { meses: 240, etiqueta: '240 meses (20 años, vivienda)' },
]

// Deja pasar dígitos y un solo punto decimal (para tasas como "24.5").
function sanitizarDecimal(valor) {
  const limpio = valor.replace(/[^\d.]/g, '')
  const partes = limpio.split('.')
  return partes.length > 2 ? `${partes[0]}.${partes.slice(1).join('')}` : limpio
}

function CalculadoraCuotaCredito({ onVolver }) {
  const formatear = useFormatoMoneda()
  const [monto, setMonto] = useState('')
  const [tasaEA, setTasaEA] = useState('')
  const [plazoMeses, setPlazoMeses] = useState(String(PLAZOS[4].meses))

  // Todo el cálculo es reactivo (sin botón "Calcular"): apenas cambian los
  // campos, se recalcula. No hay nada que guardar, así que no hace falta
  // un paso explícito de envío.
  const { error, resultado } = useMemo(() => {
    if (!monto || Number(monto) <= 0) {
      return { error: 'Ingresa el monto del crédito', resultado: null }
    }
    if (tasaEA === '' || Number(tasaEA) < 0) {
      return { error: 'Ingresa la tasa de interés (% E.A.)', resultado: null }
    }
    if (Number(tasaEA) > 300) {
      return { error: 'Ingresa una tasa razonable (hasta 300% E.A.)', resultado: null }
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
        error: 'No se pudo calcular con estos datos. Revisa el monto, la tasa y el plazo.',
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
          <button
            type="button"
            onClick={onVolver}
            aria-label="Volver"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-semibold text-text">Cuota de crédito</h1>
            <p className="text-xs text-text-dim">Sistema de amortización francés (cuota fija)</p>
          </div>
        </header>

        <div className="flex flex-col gap-4 rounded-2xl bg-panel p-4">
          <div>
            <label htmlFor="montoCredito" className="mb-1 block text-xs text-text-dim">
              Monto del crédito
            </label>
            <div className="flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3">
              <span className="text-xl font-semibold text-text-dim">$</span>
              <input
                id="montoCredito"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={monto ? new Intl.NumberFormat('es-CO').format(Number(monto)) : ''}
                onChange={(evento) => setMonto(evento.target.value.replace(/\D/g, ''))}
                className="w-full bg-transparent text-xl font-semibold text-text outline-none placeholder:text-text-dim"
              />
            </div>
          </div>

          <div>
            <label htmlFor="tasaEA" className="mb-1 block text-xs text-text-dim">
              Tasa de interés (% E.A. — Efectivo Anual)
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
              Plazo
            </label>
            <select
              id="plazoCredito"
              value={plazoMeses}
              onChange={(evento) => setPlazoMeses(evento.target.value)}
              className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none"
            >
              {PLAZOS.map((plazo) => (
                <option key={plazo.meses} value={plazo.meses}>
                  {plazo.etiqueta}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-coral">{error}</p>
        )}

        {resultado && (
          <div className="flex flex-col gap-3 rounded-2xl bg-panel p-4">
            <div className="rounded-2xl bg-mint/10 px-4 py-3 text-center">
              <p className="text-xs text-text-dim">Cuota mensual</p>
              <p className="text-2xl font-bold text-mint">{formatear(Math.round(resultado.cuota))}</p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-text-dim">Total a pagar ({plazoMeses} cuotas)</p>
              <p className="text-sm font-semibold text-text">
                {formatear(Math.round(resultado.totalPagado))}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-text-dim">Total de intereses</p>
              <p className="text-sm font-semibold text-coral">
                {formatear(Math.round(resultado.totalIntereses))}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-line pt-3">
              <p className="text-xs text-text-dim">Tasa mensual equivalente</p>
              <p className="text-xs text-text-dim">{(resultado.tasaMensual * 100).toFixed(3)}%</p>
            </div>
          </div>
        )}

        <p className="rounded-2xl bg-panel-2 px-4 py-3 text-xs leading-relaxed text-text-dim">
          Cálculo estimado con fines educativos. Los valores reales de tu banco pueden variar por
          seguros, comisiones u otros cargos. Consulta las condiciones exactas con tu entidad
          financiera.
        </p>
      </div>
    </main>
  )
}

export default CalculadoraCuotaCredito
