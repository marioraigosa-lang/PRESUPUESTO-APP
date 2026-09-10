import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Banknote } from 'lucide-react'
import { useIdioma } from '../../../context/IdiomaContext'
import AyudaContextual from '../../AyudaContextual'

// Primer paso: los mismos 4 tipos de HojaNuevoMovimiento ("Pagar tarjeta" es
// una extensión posterior, fuera de alcance por ahora), como tarjetas
// compactas y tocables en vez del segmentado del formulario.
// AUTO-AVANCE: tocar una tarjeta la elige y pasa al siguiente paso en el
// mismo toque (ver PARCHAR/ELEGIR_TIPO en reductorAsistente.js).
//
// Iconos: line icons de lucide-react con el MISMO trazo (strokeWidth 2) que
// la navegación inferior (NavegacionInferior.jsx), para coherencia -- antes
// eran emojis (💸💰🔄🏧). Cada tipo conserva su color de tema (coral/mint/
// azul/gold) en un fondo tenue.
const TIPOS = [
  {
    valor: 'gasto',
    claveLabel: 'movimientos.formulario.tipoGasto',
    Icono: ArrowUpRight,
    clases: 'border-coral/25 bg-coral/10 text-coral hover:border-coral/45 hover:bg-coral/15',
  },
  {
    valor: 'ingreso',
    claveLabel: 'movimientos.formulario.tipoIngreso',
    Icono: ArrowDownLeft,
    clases: 'border-mint/25 bg-mint/10 text-mint hover:border-mint/45 hover:bg-mint/15',
  },
  {
    valor: 'traslado',
    claveLabel: 'movimientos.formulario.tipoTraslado',
    Icono: ArrowLeftRight,
    clases: 'border-azul/25 bg-azul/10 text-azul hover:border-azul/45 hover:bg-azul/15',
  },
  {
    valor: 'retiro',
    claveLabel: 'movimientos.formulario.tipoRetiro',
    Icono: Banknote,
    clases: 'border-gold/25 bg-gold/10 text-gold hover:border-gold/45 hover:bg-gold/15',
  },
]

function PasoTipo({ cuentas, onElegir }) {
  const { t } = useIdioma()
  const hayMenosDeDosCuentas = cuentas.length < 2

  return (
    <div className="flex flex-col gap-5 pt-1">
      <div className="flex items-start gap-2">
        <h2 className="text-xl font-bold leading-tight text-text">
          {t('movimientos.asistente.preguntaTipo')}
        </h2>
        <AyudaContextual clave="guia.ayuda.movimientoTipos" etiqueta={t('guia.ayuda.movimientoTiposAria')} />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {TIPOS.map(({ valor, claveLabel, Icono, clases }) => {
          const deshabilitado = valor === 'traslado' && hayMenosDeDosCuentas

          return (
            <div key={valor} className="flex flex-col gap-1.5">
              <button
                type="button"
                disabled={deshabilitado}
                onClick={() => onElegir(valor)}
                className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-4 text-sm font-semibold transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${clases}`}
              >
                <Icono className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
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
