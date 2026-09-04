import { Pencil, Trash2, Pin } from 'lucide-react'
import { useFormatoMoneda } from '../context/MonedaContext'
import { useIdioma } from '../context/IdiomaContext'
import { descripcionEnContexto } from '../utils/movimientosCuenta'

function Movimiento({ movimiento, cuentaContextoId, tarjetaContextoId, eliminando, onEditar, onEliminar }) {
  const formatear = useFormatoMoneda()
  const { t } = useIdioma()
  const {
    tipo,
    cuenta,
    cuentaDestino,
    cuenta_id: cuentaIdOrigen,
    fecha,
    emoji,
    monto,
    gasto_fijo_id: gastoFijoId,
  } = movimiento
  const esIngreso = tipo === 'ingreso'
  const esTraslado = tipo === 'traslado'
  const esRetiro = tipo === 'retiro'
  // Un pago a tarjeta (Fase 5 del plan de tarjetas de crédito) no se puede
  // editar (ver actualizarMovimiento en services/movimientos.js) -- solo
  // borrar. gasto_fijo_id sigue mandando por encima: si además viniera de
  // un gasto fijo (nunca pasa hoy, pago_tarjeta no se crea desde ahí, pero
  // se deja explícito por si acaso) se ve como el Pin, no como "solo
  // borrar".
  const esPagoTarjeta = tipo === 'pago_tarjeta'
  const esEditable = !gastoFijoId && !esPagoTarjeta

  // Perspectiva direccional: solo aplica a traslados, y solo cuando la
  // pantalla que llama indica desde qué cuenta se está mirando la lista
  // (ver decisión de diseño: un traslado se muestra como egreso en la
  // cuenta origen -- "Traslado a X", en coral -- y como ingreso en la
  // cuenta destino -- "Traslado desde Y", en mint -- en vez del azul
  // neutro que usa Home). Sin `cuentaContextoId` (uso en Home/
  // MovimientosRecientes, donde se ve el movimiento "desde afuera") se
  // conserva el comportamiento de siempre.
  const esTrasladoEnContexto = esTraslado && Boolean(cuentaContextoId)
  const esOrigenEnContexto = esTrasladoEnContexto && cuentaIdOrigen === cuentaContextoId

  // Perspectiva de DEUDA: solo aplica dentro de DetalleTarjeta.jsx
  // (`tarjetaContextoId` pasado), donde esta lista solo puede traer 'gasto'
  // (sube la deuda) o 'pago_tarjeta' (la baja) -- ver
  // construirConsultaMovimientosPeriodo. Coral/"+" para el gasto (la deuda
  // crece, mismo color que "egreso" en el resto de la app) y mint/"−" para
  // el pago (la deuda baja, buena noticia).
  const enContextoTarjeta = Boolean(tarjetaContextoId)

  const descripcionMostrada = esTrasladoEnContexto
    ? descripcionEnContexto(movimiento, cuentaContextoId, t)
    : movimiento.descripcion

  const colorIcono = enContextoTarjeta
    ? esPagoTarjeta
      ? 'border-transparent bg-mint/15'
      : 'border-transparent bg-coral/15'
    : esTrasladoEnContexto
      ? esOrigenEnContexto
        ? 'border-transparent bg-coral/15'
        : 'border-transparent bg-mint/15'
      : esIngreso
        ? 'border-transparent bg-mint/15'
        : esTraslado
          ? 'border-transparent bg-azul/15'
          : esRetiro
            ? 'border-transparent bg-coral/15'
            : 'border-line bg-panel-2'

  // Para un traslado visto "desde afuera", la segunda línea muestra el
  // recorrido del dinero (origen → destino) en vez de solo la cuenta. Si la
  // cuenta destino ya no existe (fue eliminada después), lo avisamos en vez
  // de mostrar vacío. En la perspectiva direccional ya no hace falta -- el
  // texto principal ya dice "a"/"desde" qué cuenta.
  const subtitulo = esTrasladoEnContexto
    ? fecha
    : `${fecha} · ${esTraslado ? `${cuenta} → ${cuentaDestino ?? t('home.cuentaEliminada')}` : cuenta}`

  const colorMonto = enContextoTarjeta
    ? esPagoTarjeta
      ? 'text-mint'
      : 'text-coral'
    : esTrasladoEnContexto
      ? esOrigenEnContexto
        ? 'text-coral'
        : 'text-mint'
      : esIngreso
        ? 'text-mint'
        : esTraslado
          ? 'text-azul'
          : esRetiro
            ? 'text-coral'
            : 'text-text'

  const signoMonto = enContextoTarjeta
    ? esPagoTarjeta
      ? '−'
      : '+'
    : esTrasladoEnContexto
      ? esOrigenEnContexto
        ? '−'
        : '+'
      : esIngreso
        ? '+'
        : esTraslado
          ? ''
          : '−'

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-panel-2 px-4 py-3">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg ${colorIcono}`}
      >
        {emoji}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">{descripcionMostrada}</p>
        <p className="truncate text-xs text-text-dim">{subtitulo}</p>
      </div>

      <p className={`shrink-0 text-sm font-semibold ${colorMonto}`}>
        {signoMonto}
        {formatear(monto)}
      </p>

      {gastoFijoId ? (
        <span className="shrink-0 px-1 text-text-dim" title={t('home.vieneDeGastoFijo')}>
          <Pin className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      ) : (
        <div className="flex shrink-0 items-center gap-1">
          {esEditable && (
            <button
              type="button"
              onClick={onEditar}
              aria-label={t('home.editarMovimiento', { descripcion: descripcionMostrada })}
              className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel hover:text-mint"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={onEliminar}
            disabled={eliminando}
            aria-label={t('home.eliminarMovimiento', { descripcion: descripcionMostrada })}
            className="flex h-7 w-7 items-center justify-center rounded-full text-coral/70 hover:bg-panel hover:text-coral disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}

export default Movimiento
