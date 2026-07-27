import { useMemo, useState } from 'react'
import { useFormatoMoneda } from '../context/MonedaContext'

function sanitizarDecimal(valor) {
  const limpio = valor.replace(/[^\d.]/g, '')
  const partes = limpio.split('.')
  return partes.length > 2 ? `${partes[0]}.${partes.slice(1).join('')}` : limpio
}

const DIAS_POR_ANO = 365
const DIAS_POR_MES = DIAS_POR_ANO / 12

function convertirEaATasaPeriodo(tasaEA, periodosPorAno) {
  return Math.pow(1 + Number(tasaEA) / 100, 1 / periodosPorAno) - 1
}

function CalculadoraCdt({ onVolver }) {
  const formatear = useFormatoMoneda()
  const [monto, setMonto] = useState('')
  const [plazoMeses, setPlazoMeses] = useState('')
  const [tasaCdt, setTasaCdt] = useState('')
  const [tasaCuenta, setTasaCuenta] = useState('')
  const [frecuenciaCuenta, setFrecuenciaCuenta] = useState('diaria')

  const { error, resultado } = useMemo(() => {
    if (!monto || Number(monto) <= 0) {
      return { error: 'Ingresa el monto a invertir', resultado: null }
    }
    if (!plazoMeses || Number(plazoMeses) <= 0) {
      return { error: 'Ingresa el plazo en meses', resultado: null }
    }
    if (tasaCdt === '' || Number(tasaCdt) < 0 || tasaCuenta === '' || Number(tasaCuenta) < 0) {
      return { error: 'Ingresa las dos tasas de interés (% E.A.)', resultado: null }
    }
    if (Number(tasaCdt) > 100 || Number(tasaCuenta) > 100) {
      return { error: 'Ingresa tasas razonables (hasta 100% E.A.)', resultado: null }
    }

    const P = Number(monto)
    const n = Number(plazoMeses)
    const anios = n / 12

    // CDT: paga los intereses de una sola vez al vencimiento, con la
    // tasa E.A. aplicada directamente sobre el plazo en años.
    const montoFinalCdt = P * Math.pow(1 + Number(tasaCdt) / 100, anios)

    // Cuenta de alto rendimiento: los intereses se liquidan (se suman al
    // capital) con la frecuencia elegida, así que hay que convertir la
    // tasa E.A. a su tasa equivalente por periodo y capitalizar periodo
    // a periodo durante todo el plazo. Los días transcurridos se calculan
    // con el promedio real de días por mes (365/12) para que el plazo en
    // días y en meses representen exactamente el mismo tiempo -- si no,
    // la comparación quedaría sesgada por el solo hecho de contar mal los
    // días, y no por una diferencia real de frecuencia de liquidación.
    let montoFinalCuenta
    if (frecuenciaCuenta === 'diaria') {
      const tasaDiaria = convertirEaATasaPeriodo(tasaCuenta, DIAS_POR_ANO)
      const dias = n * DIAS_POR_MES
      montoFinalCuenta = P * Math.pow(1 + tasaDiaria, dias)
    } else {
      const tasaMensual = convertirEaATasaPeriodo(tasaCuenta, 12)
      montoFinalCuenta = P * Math.pow(1 + tasaMensual, n)
    }

    if (!Number.isFinite(montoFinalCdt) || !Number.isFinite(montoFinalCuenta)) {
      return {
        error: 'No se pudo calcular con estos datos. Revisa el monto, las tasas y el plazo.',
        resultado: null,
      }
    }

    const diferencia = montoFinalCuenta - montoFinalCdt

    return {
      error: null,
      resultado: {
        montoFinalCdt,
        montoFinalCuenta,
        gananciaCdt: montoFinalCdt - P,
        gananciaCuenta: montoFinalCuenta - P,
        diferencia,
      },
    }
  }, [monto, plazoMeses, tasaCdt, tasaCuenta, frecuenciaCuenta])

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
            <h1 className="text-lg font-semibold text-text">CDT vs. cuenta de alto rendimiento</h1>
            <p className="text-xs text-text-dim">Compara dónde rinde más tu plata</p>
          </div>
        </header>

        <div className="flex flex-col gap-4 rounded-2xl bg-panel p-4">
          <div>
            <label htmlFor="montoInvertir" className="mb-1 block text-xs text-text-dim">
              Monto a invertir
            </label>
            <div className="flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3">
              <span className="text-xl font-semibold text-text-dim">$</span>
              <input
                id="montoInvertir"
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
            <label htmlFor="plazoCdt" className="mb-1 block text-xs text-text-dim">
              Plazo (meses)
            </label>
            <input
              id="plazoCdt"
              type="text"
              inputMode="numeric"
              placeholder="Ej: 6"
              value={plazoMeses}
              onChange={(evento) => setPlazoMeses(evento.target.value.replace(/\D/g, ''))}
              className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="tasaCdt" className="mb-1 block text-xs text-text-dim">
                Tasa CDT (% E.A.)
              </label>
              <div className="flex items-center gap-1 rounded-2xl bg-panel-2 px-3 py-3">
                <input
                  id="tasaCdt"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={tasaCdt}
                  onChange={(evento) => setTasaCdt(sanitizarDecimal(evento.target.value))}
                  className="w-full bg-transparent text-sm font-semibold text-text outline-none placeholder:text-text-dim"
                />
                <span className="text-sm font-semibold text-text-dim">%</span>
              </div>
            </div>

            <div>
              <label htmlFor="tasaCuenta" className="mb-1 block text-xs text-text-dim">
                Tasa cuenta (% E.A.)
              </label>
              <div className="flex items-center gap-1 rounded-2xl bg-panel-2 px-3 py-3">
                <input
                  id="tasaCuenta"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={tasaCuenta}
                  onChange={(evento) => setTasaCuenta(sanitizarDecimal(evento.target.value))}
                  className="w-full bg-transparent text-sm font-semibold text-text outline-none placeholder:text-text-dim"
                />
                <span className="text-sm font-semibold text-text-dim">%</span>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-1 block text-xs text-text-dim">
              Frecuencia de liquidación (cuenta de alto rendimiento)
            </p>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-panel-2 p-1">
              <button
                type="button"
                onClick={() => setFrecuenciaCuenta('diaria')}
                aria-pressed={frecuenciaCuenta === 'diaria'}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  frecuenciaCuenta === 'diaria'
                    ? 'bg-mint/20 text-mint'
                    : 'text-text-dim hover:text-text'
                }`}
              >
                Diaria
              </button>
              <button
                type="button"
                onClick={() => setFrecuenciaCuenta('mensual')}
                aria-pressed={frecuenciaCuenta === 'mensual'}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  frecuenciaCuenta === 'mensual'
                    ? 'bg-mint/20 text-mint'
                    : 'text-text-dim hover:text-text'
                }`}
              >
                Mensual
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-coral">{error}</p>
        )}

        {resultado && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 rounded-2xl bg-gold/10 p-4">
                <p className="text-xs font-semibold text-gold">CDT</p>
                <p className="text-lg font-bold text-text">
                  {formatear(Math.round(resultado.montoFinalCdt))}
                </p>
                <p className="text-xs text-text-dim">
                  +{formatear(Math.round(resultado.gananciaCdt))}
                </p>
              </div>

              <div className="flex flex-col gap-1 rounded-2xl bg-mint/10 p-4">
                <p className="text-xs font-semibold text-mint">Cuenta alto rendimiento</p>
                <p className="text-lg font-bold text-text">
                  {formatear(Math.round(resultado.montoFinalCuenta))}
                </p>
                <p className="text-xs text-text-dim">
                  +{formatear(Math.round(resultado.gananciaCuenta))}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-panel p-4 text-center">
              {Math.abs(resultado.diferencia) < 1 ? (
                <p className="text-sm font-medium text-text">Ambas opciones rinden prácticamente igual</p>
              ) : (
                <p className="text-sm font-medium text-text">
                  {resultado.diferencia > 0 ? 'La cuenta de alto rendimiento' : 'El CDT'} rinde más, por{' '}
                  <span className="font-bold text-mint">
                    {formatear(Math.round(Math.abs(resultado.diferencia)))}
                  </span>{' '}
                  al final del plazo
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="rounded-2xl bg-panel-2 px-4 py-3 text-xs leading-relaxed text-text-dim">
            ¿Diaria o mensual: cuál rinde más? Cuando dos productos anuncian la misma tasa
            efectiva anual (E.A.), en realidad rinden prácticamente igual sin importar si liquidan
            los intereses cada día o cada mes -- la E.A. ya lleva "incorporado" el efecto de la
            capitalización, por eso se llama "efectiva". Lo que sí es cierto es la idea general:
            entre más seguido te liquiden los intereses, más rápido empiezan esos intereses a
            generar sus propios intereses (interés compuesto). Verás una ventaja real de la
            liquidación diaria cuando las dos opciones parten de una tasa distinta a esa
            frecuencia (no de la misma E.A.), o en el mundo real, por pequeñas diferencias en
            cómo cada entidad cuenta los días.
          </p>
          <p className="rounded-2xl bg-panel-2 px-4 py-3 text-xs leading-relaxed text-text-dim">
            Supuesto de este cálculo: el CDT paga los intereses al vencimiento con su tasa E.A.
            aplicada sobre el plazo en años. La cuenta de alto rendimiento liquida intereses con
            la frecuencia que elijas arriba, así que su tasa E.A. se convierte a la tasa
            equivalente por periodo (diaria o mensual) y se capitaliza periodo a periodo, usando
            el promedio real de días por mes (365/12) para que el plazo en días y en meses
            representen exactamente el mismo tiempo. Cálculo estimado con fines educativos: los
            valores reales pueden variar por GMF, retención en la fuente u otras condiciones.
            Consulta con tu entidad financiera.
          </p>
        </div>
      </div>
    </main>
  )
}

export default CalculadoraCdt
