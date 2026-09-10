import { useIdioma } from '../../../context/IdiomaContext'
import AyudaContextual from '../../AyudaContextual'

// Primer paso: los mismos 4 tipos de HojaNuevoMovimiento ("Pagar tarjeta" es
// una extensión posterior, fuera de alcance por ahora), como tarjetas
// grandes y tocables en vez del segmentado compacto del formulario -- acá
// hay espacio de sobra porque es lo único que se pregunta en la pantalla.
// AUTO-AVANCE: tocar una tarjeta la elige y pasa al siguiente paso en el
// mismo toque (ver PARCHAR/ELEGIR_TIPO en reductorAsistente.js).
const TIPOS = [
  { valor: 'gasto', claveLabel: 'movimientos.formulario.tipoGasto', emoji: '💸', clases: 'bg-coral/10 text-coral' },
  {
    valor: 'ingreso',
    claveLabel: 'movimientos.formulario.tipoIngreso',
    emoji: '💰',
    clases: 'bg-mint/10 text-mint',
  },
  {
    valor: 'traslado',
    claveLabel: 'movimientos.formulario.tipoTraslado',
    emoji: '🔄',
    clases: 'bg-azul/10 text-azul',
  },
  {
    valor: 'retiro',
    claveLabel: 'movimientos.formulario.tipoRetiro',
    emoji: '🏧',
    clases: 'bg-gold/10 text-gold',
  },
]

function PasoTipo({ cuentas, onElegir }) {
  const { t } = useIdioma()
  const hayMenosDeDosCuentas = cuentas.length < 2

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <p className="text-sm text-text-dim">{t('movimientos.asistente.preguntaTipo')}</p>
        <AyudaContextual clave="guia.ayuda.movimientoTipos" etiqueta={t('guia.ayuda.movimientoTiposAria')} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {TIPOS.map(({ valor, claveLabel, emoji, clases }) => {
          const deshabilitado = valor === 'traslado' && hayMenosDeDosCuentas

          return (
            <div key={valor} className="flex flex-col gap-1">
              <button
                type="button"
                disabled={deshabilitado}
                onClick={() => onElegir(valor)}
                className={`flex min-h-[96px] w-full flex-col items-center justify-center gap-2 rounded-3xl py-5 text-sm font-semibold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${clases}`}
              >
                <span className="text-3xl" aria-hidden="true">
                  {emoji}
                </span>
                {t(claveLabel)}
              </button>
              {deshabilitado && (
                <p className="text-center text-[11px] text-text-dim">
                  {t('movimientos.asistente.trasladoDeshabilitadoNota')}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PasoTipo
