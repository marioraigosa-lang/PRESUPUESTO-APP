import { Info } from 'lucide-react'
import { useIdioma } from '../../../context/IdiomaContext'
import { useFormatoMoneda } from '../../../context/MonedaContext'
import ResumenBorrador from '../ResumenBorrador'
import MensajeError from '../../ui/MensajeError'

// Último paso. A propósito SIN foco automático (a diferencia de PasoMonto):
// es opcional, así que no tiene sentido interrumpir con el teclado a alguien
// que ya va a tocar "Guardar" de una. El mini-resumen de acá SÍ es tocable
// (a diferencia del de PasoMonto): es la última oportunidad de corregir algo
// antes de guardar, sin tener que retroceder paso a paso.
//
// El input es un componente CONTROLADO por borrador.descripcion (sin estado
// local propio): cada tecla llama a onCambiar, que despacha ACTUALIZAR al
// borrador en AsistenteMovimiento.jsx SIN avanzar de paso. Antes el texto
// vivía en un useState de acá, y como el contenedor envuelve cada paso en
// <div key={indice}>, salir de Concepto (Volver, o un chip del mini-resumen)
// lo desmontaba y perdía lo escrito -- guardarlo en el borrador lo deja vivo
// sin importar cuántas veces se entre y salga de este paso.
//
// `guardando`/`errorGuardado` vienen de AsistenteMovimiento.jsx -- ahí vive
// el guardado real (onGuardar), acá solo se refleja el estado: mismo botón
// deshabilitado mientras guarda, mismo botón se convierte en "Reintentar" si
// el guardado anterior falló (y como el borrador ya tiene el texto, un
// reintento no depende de que este componente siga montado).
function PasoConcepto({
  borrador,
  cuentas,
  tarjetas,
  categorias,
  pasos,
  guardando,
  errorGuardado,
  onCambiar,
  onSaltar,
  onFinalizar,
}) {
  const { t } = useIdioma()
  const formatear = useFormatoMoneda()

  const clavePlaceholder =
    borrador.tipo === 'traslado'
      ? 'movimientos.formulario.descripcionPlaceholderTraslado'
      : borrador.tipo === 'retiro'
        ? 'movimientos.formulario.descripcionPlaceholderRetiro'
        : borrador.tipo === 'pago_tarjeta'
          ? 'movimientos.asistente.pagoTarjeta.conceptoPlaceholder'
          : 'movimientos.formulario.descripcionPlaceholderGasto'

  function manejarEnvio(evento) {
    evento.preventDefault()
    onFinalizar()
  }

  return (
    <form onSubmit={manejarEnvio} className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-5 pt-1">
        <ResumenBorrador
          borrador={borrador}
          pasos={pasos}
          cuentas={cuentas}
          tarjetas={tarjetas}
          categorias={categorias}
          montoFormateado={formatear(Number(borrador.monto))}
          tocable={!guardando}
          onSaltar={onSaltar}
        />

        <div>
          <h2 className="text-xl font-bold leading-tight text-text">
            {t('movimientos.asistente.preguntaConcepto')}
          </h2>
          <input
            type="text"
            value={borrador.descripcion}
            onChange={(evento) => onCambiar(evento.target.value)}
            placeholder={t(clavePlaceholder)}
            disabled={guardando}
            className="mt-3 w-full rounded-xl border border-line/60 bg-panel-2 px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-text-dim focus:border-mint/50 disabled:opacity-60"
          />
          <p className="mt-2 text-xs text-text-dim">{t('movimientos.asistente.conceptoOpcionalNota')}</p>
        </div>

        {/* Aviso de coherencia: desde que el retiro cuenta como gasto del
        mes en Resumen/Home/gráficos/Fondo de emergencia (antes solo
        contaba como "egreso" de la cuenta, no como gasto), esto evita que
        el usuario se sorprenda al ver su gasto mensual subir por un
        retiro. Estilo sutil (icono + texto chico), a propósito discreto:
        no es un error ni una advertencia, es solo información. */}
        {borrador.tipo === 'retiro' && (
          <div className="flex items-start gap-2 rounded-xl bg-azul/10 px-3 py-2 text-xs text-text-dim">
            <Info size={14} className="mt-0.5 shrink-0 text-azul" />
            <p>{t('movimientos.asistente.avisoRetiroGasto')}</p>
          </div>
        )}

        {errorGuardado && <MensajeError>{t('movimientos.formulario.errorGuardar')}</MensajeError>}
      </div>

      {/* Mismo footer "fijo" vía sticky que PasoMonto -- ver comentario ahí. */}
      <div className="sticky bottom-0 -mx-5 mt-5 border-t border-line/60 bg-panel px-5 pb-4 pt-3">
        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-xl bg-mint py-3.5 text-sm font-semibold text-bg transition-transform active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
        >
          {guardando
            ? t('movimientos.formulario.guardando')
            : errorGuardado
              ? t('movimientos.asistente.reintentar')
              : t('movimientos.asistente.guardarBoton')}
        </button>
      </div>
    </form>
  )
}

export default PasoConcepto
