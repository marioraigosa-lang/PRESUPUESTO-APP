import { useMemo, useState } from 'react'
import { useIdioma } from '../context/IdiomaContext'
import { useFormatoMoneda, useMoneda } from '../context/MonedaContext'
import { configMoneda } from '../utils/monedas'
import { limpiarEntradaMonto, formatearEntradaMonto } from '../utils/inputMoneda'
import AyudaContextual from '../components/AyudaContextual'

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
  const { t } = useIdioma()
  const formatear = useFormatoMoneda()
  const { moneda } = useMoneda()
  const { simbolo, decimales } = configMoneda(moneda)
  const [monto, setMonto] = useState('')
  const [plazoMeses, setPlazoMeses] = useState('')
  const [tasaCdt, setTasaCdt] = useState('')
  const [tasaCuenta, setTasaCuenta] = useState('')
  const [frecuenciaCuenta, setFrecuenciaCuenta] = useState('diaria')

  const { error, resultado } = useMemo(() => {
    if (!monto || Number(monto) <= 0) {
      return { error: t('calculadoraCdt.errorMontoVacio'), resultado: null }
    }
    if (!plazoMeses || Number(plazoMeses) <= 0) {
      return { error: t('calculadoraCdt.errorPlazoVacio'), resultado: null }
    }
    if (tasaCdt === '' || Number(tasaCdt) < 0 || tasaCuenta === '' || Number(tasaCuenta) < 0) {
      return { error: t('calculadoraCdt.errorTasasVacias'), resultado: null }
    }
    if (Number(tasaCdt) > 100 || Number(tasaCuenta) > 100) {
      return { error: t('calculadoraCdt.errorTasasExcesivas'), resultado: null }
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
        error: t('calculadoraCdt.errorCalculo'),
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

  // La frase de comparación ("La cuenta de alto rendimiento rinde más, por
  // $X al final del plazo") se arma completa por idioma vía t() -- nunca
  // concatenando fragmentos sueltos, porque el orden de las palabras
  // alrededor del monto cambia entre español e inglés. Para conservar el
  // monto resaltado en negrita (mint) dentro de esa frase ya traducida, se
  // ubica el texto del monto formateado dentro de la frase completa y se
  // separa en "antes"/"después" alrededor de él.
  const comparacion = useMemo(() => {
    if (!resultado || Math.abs(resultado.diferencia) < 1) return null

    const montoTexto = formatear(Math.round(Math.abs(resultado.diferencia)))
    const ganador =
      resultado.diferencia > 0 ? t('calculadoraCdt.ganadorCuenta') : t('calculadoraCdt.ganadorCdt')
    const frase = t('calculadoraCdt.comparacion', { ganador, monto: montoTexto })
    const indice = frase.indexOf(montoTexto)

    if (indice === -1) return { antes: frase, monto: '', despues: '' }

    return {
      antes: frase.slice(0, indice),
      monto: montoTexto,
      despues: frase.slice(indice + montoTexto.length),
    }
  }, [resultado, formatear, t])

  return (
    <main className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pb-28">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            aria-label={t('calculadoraCdt.volverAria')}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text"
          >
            ←
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-semibold text-text">{t('calculadoraCdt.titulo')}</h1>
              <AyudaContextual clave="guia.ayuda.calcCdt" etiqueta={t('guia.ayuda.calcCdtAria')} />
            </div>
            <p className="text-xs text-text-dim">{t('calculadoraCdt.subtitulo')}</p>
          </div>
        </header>

        <div className="flex flex-col gap-4 rounded-2xl bg-panel p-4">
          <div>
            <label htmlFor="montoInvertir" className="mb-1 block text-xs text-text-dim">
              {t('calculadoraCdt.montoLabel')}
            </label>
            <div className="flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3">
              <span className="text-xl font-semibold text-text-dim">{simbolo}</span>
              <input
                id="montoInvertir"
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
            <label htmlFor="plazoCdt" className="mb-1 block text-xs text-text-dim">
              {t('calculadoraCdt.plazoLabel')}
            </label>
            <input
              id="plazoCdt"
              type="text"
              inputMode="numeric"
              placeholder={t('calculadoraCdt.plazoPlaceholder')}
              value={plazoMeses}
              onChange={(evento) => setPlazoMeses(evento.target.value.replace(/\D/g, ''))}
              className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="tasaCdt" className="mb-1 block text-xs text-text-dim">
                {t('calculadoraCdt.tasaCdtLabel')}
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
                {t('calculadoraCdt.tasaCuentaLabel')}
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
            <p className="mb-1 block text-xs text-text-dim">{t('calculadoraCdt.frecuenciaLabel')}</p>
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
                {t('calculadoraCdt.frecuenciaDiaria')}
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
                {t('calculadoraCdt.frecuenciaMensual')}
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
                <p className="text-xs font-semibold text-gold">{t('calculadoraCdt.cdtBadge')}</p>
                <p className="text-lg font-bold text-text">
                  {formatear(Math.round(resultado.montoFinalCdt))}
                </p>
                <p className="text-xs text-text-dim">
                  +{formatear(Math.round(resultado.gananciaCdt))}
                </p>
              </div>

              <div className="flex flex-col gap-1 rounded-2xl bg-mint/10 p-4">
                <p className="text-xs font-semibold text-mint">
                  {t('calculadoraCdt.cuentaAltoRendimientoLabel')}
                </p>
                <p className="text-lg font-bold text-text">
                  {formatear(Math.round(resultado.montoFinalCuenta))}
                </p>
                <p className="text-xs text-text-dim">
                  +{formatear(Math.round(resultado.gananciaCuenta))}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-panel p-4 text-center">
              {!comparacion ? (
                <p className="text-sm font-medium text-text">{t('calculadoraCdt.empate')}</p>
              ) : (
                <p className="text-sm font-medium text-text">
                  {comparacion.antes}
                  <span className="font-bold text-mint">{comparacion.monto}</span>
                  {comparacion.despues}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="rounded-2xl bg-panel-2 px-4 py-3 text-xs leading-relaxed text-text-dim">
            {t('calculadoraCdt.notaFrecuencia')}
          </p>
          <p className="rounded-2xl bg-panel-2 px-4 py-3 text-xs leading-relaxed text-text-dim">
            {t('calculadoraCdt.notaSupuestos')}
          </p>
        </div>
      </div>
    </main>
  )
}

export default CalculadoraCdt
