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

function PasoCuenta({ paso, tipo, borrador, cuentas, tarjetas, onElegir }) {
  const { t } = useIdioma()
  const formatear = useFormatoMoneda()
  const sugeridaId = paso === 'tarjeta' ? borrador.tarjetaId : paso === 'cuentaDestino' ? borrador.cuentaDestinoId : borrador.cuentaId

  if (paso === 'origen') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-dim">{t(PREGUNTAS.origen)}</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onElegir({ origen: 'cuenta' })}
            className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-3xl bg-mint/10 py-5 text-sm font-semibold text-mint transition-transform active:scale-[0.98]"
          >
            <span className="text-2xl" aria-hidden="true">
              🏦
            </span>
            {t('movimientos.formulario.origenCuenta')}
          </button>
          <button
            type="button"
            onClick={() => onElegir({ origen: 'tarjeta' })}
            className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-3xl bg-coral/10 py-5 text-sm font-semibold text-coral transition-transform active:scale-[0.98]"
          >
            <span className="text-2xl" aria-hidden="true">
              💳
            </span>
            {t('movimientos.formulario.origenTarjeta')}
          </button>
        </div>
      </div>
    )
  }

  if (paso === 'tarjeta') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-dim">{t(PREGUNTAS.tarjeta)}</p>
        {tarjetas.length === 0 ? (
          <p className="rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text-dim">
            {t('movimientos.asistente.sinTarjetasParaElegir')}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {tarjetas.map((tarjeta) => (
              <button
                key={tarjeta.id}
                type="button"
                onClick={() => onElegir({ tarjetaId: tarjeta.id })}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors active:scale-[0.99] ${
                  tarjeta.id === sugeridaId ? 'bg-panel-2 ring-1 ring-coral/60' : 'bg-panel-2'
                }`}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-bg"
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
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-dim">{t(claveLabel)}</p>
      {cuentas.length === 0 ? (
        <p className="rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text-dim">
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
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${
                  cuenta.id === sugeridaId && !deshabilitada ? 'bg-panel-2 ring-1 ring-mint/60' : 'bg-panel-2'
                }`}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-bg"
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
