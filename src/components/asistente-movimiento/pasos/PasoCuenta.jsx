import { Landmark, CreditCard } from 'lucide-react'
import { useIdioma } from '../../../context/IdiomaContext'
import { useFormatoMoneda } from '../../../context/MonedaContext'

// Un solo componente para TODOS los pasos que eligen una cuenta, una
// tarjeta, o el origen cuenta/tarjeta de un gasto -- flujos.js decide cuál
// de estos nombres de paso corresponde en cada momento ('cuenta',
// 'cuentaGasto', 'cuentaOrigen', 'cuentaDestino', 'tarjeta', 'origen'); acá
// solo cambia la pregunta y la lista, no la mecánica. AUTO-AVANCE: tocar una
// cuenta/tarjeta la elige y pasa al siguiente paso en el mismo toque.
//
// El campo del borrador que cada paso llena ya viene precargado con la
// "última cuenta/categoría usada" (ver ultimoUsado.js y ELEGIR_TIPO en
// reductorAsistente.js) cuando no hay preselección explícita -- por eso acá
// alcanza con leer ese mismo campo para saber cuál resaltar con un anillo:
// nada más lo toca hasta que el usuario elige, así que sigue siendo
// justamente la sugerencia mientras no se haya tocado nada.
const PREGUNTAS = {
  cuentaGasto: 'movimientos.asistente.preguntaCuentaGasto',
  cuentaOrigen: 'movimientos.asistente.preguntaCuentaOrigenTraslado',
  cuentaDestino: 'movimientos.asistente.preguntaCuentaDestinoTraslado',
  tarjeta: 'movimientos.asistente.preguntaTarjeta',
  origen: 'movimientos.formulario.origenLabel',
}

// Clases compartidas por toda fila "tarjeta táctil" de este paso (cuenta,
// tarjeta): compacta, con borde fino, hover sutil, feedback de toque, y el
// mint destacando la sugerida (última usada) con un anillo sutil.
function claseFila(esSugerida, esCoral = false) {
  const anillo = esCoral ? 'ring-coral/60' : 'ring-mint/60'
  return `flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${
    esSugerida
      ? `border-transparent bg-panel-2 ring-2 ${anillo}`
      : 'border-line/60 bg-panel-2 hover:border-line hover:bg-panel-2/70'
  }`
}

function PasoCuenta({ paso, tipo, borrador, cuentas, tarjetas, onElegir }) {
  const { t } = useIdioma()
  const formatear = useFormatoMoneda()
  const sugeridaId = paso === 'tarjeta' ? borrador.tarjetaId : paso === 'cuentaDestino' ? borrador.cuentaDestinoId : borrador.cuentaId

  if (paso === 'origen') {
    return (
      <div className="flex flex-col gap-5 pt-1">
        <h2 className="text-xl font-bold leading-tight text-text">{t(PREGUNTAS.origen)}</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onElegir({ origen: 'cuenta' })}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-mint/25 bg-mint/10 px-3 py-4 text-sm font-semibold text-mint transition-all duration-150 hover:border-mint/45 hover:bg-mint/15 active:scale-[0.97]"
          >
            <Landmark className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            {t('movimientos.formulario.origenCuenta')}
          </button>
          <button
            type="button"
            onClick={() => onElegir({ origen: 'tarjeta' })}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-coral/25 bg-coral/10 px-3 py-4 text-sm font-semibold text-coral transition-all duration-150 hover:border-coral/45 hover:bg-coral/15 active:scale-[0.97]"
          >
            <CreditCard className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            {t('movimientos.formulario.origenTarjeta')}
          </button>
        </div>
      </div>
    )
  }

  if (paso === 'tarjeta') {
    return (
      <div className="flex flex-col gap-5 pt-1">
        <h2 className="text-xl font-bold leading-tight text-text">{t(PREGUNTAS.tarjeta)}</h2>
        {tarjetas.length === 0 ? (
          <p className="rounded-xl bg-panel-2 px-4 py-3 text-sm text-text-dim">
            {t('movimientos.asistente.sinTarjetasParaElegir')}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {tarjetas.map((tarjeta) => (
              <button
                key={tarjeta.id}
                type="button"
                onClick={() => onElegir({ tarjetaId: tarjeta.id })}
                className={claseFila(tarjeta.id === sugeridaId, true)}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-bg shadow-sm"
                  style={{ backgroundColor: tarjeta.color }}
                >
                  {tarjeta.inicial || tarjeta.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{tarjeta.nombre}</p>
                  <p className="truncate text-xs text-text-dim">
                    {t('movimientos.formulario.cupoDisponibleSufijo', { monto: formatear(tarjeta.cupo_disponible) })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // 'cuenta' (ingreso/retiro), 'cuentaGasto' (gasto sin tarjeta) y
  // 'cuentaOrigen' (traslado) llenan cuentaId; solo 'cuentaDestino' llena
  // cuentaDestinoId y excluye la cuenta ya elegida como origen.
  const esDestino = paso === 'cuentaDestino'
  const campo = esDestino ? 'cuentaDestinoId' : 'cuentaId'
  const claveLabel =
    paso === 'cuenta'
      ? tipo === 'ingreso'
        ? 'movimientos.asistente.preguntaCuentaIngreso'
        : 'movimientos.asistente.preguntaCuentaRetiro'
      : PREGUNTAS[paso]
  const cuentaAExcluir = esDestino ? borrador.cuentaId : null

  return (
    <div className="flex flex-col gap-5 pt-1">
      <h2 className="text-xl font-bold leading-tight text-text">{t(claveLabel)}</h2>
      {cuentas.length === 0 ? (
        <p className="rounded-xl bg-panel-2 px-4 py-3 text-sm text-text-dim">
          {t('movimientos.asistente.sinCuentasParaElegir')}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {cuentas.map((cuenta) => {
            const deshabilitada = cuenta.id === cuentaAExcluir
            return (
              <button
                key={cuenta.id}
                type="button"
                disabled={deshabilitada}
                onClick={() => onElegir({ [campo]: cuenta.id })}
                className={claseFila(cuenta.id === sugeridaId && !deshabilitada)}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-bg shadow-sm"
                  style={{ backgroundColor: cuenta.color }}
                >
                  {cuenta.inicial || cuenta.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">
                    {cuenta.nombre}
                    {deshabilitada ? ` ${t('movimientos.formulario.sufijoOrigen')}` : ''}
                  </p>
                  <p className="truncate text-xs text-text-dim">{formatear(cuenta.saldo)}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PasoCuenta
