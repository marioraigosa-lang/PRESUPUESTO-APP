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
        : 'movimientos.formulario.descripcionPlaceholderGasto'

  function manejarEnvio(evento) {
    evento.preventDefault()
    onFinalizar()
  }

  return (
    <form onSubmit={manejarEnvio} className="flex flex-col gap-3">
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
        <p className="text-sm text-text-dim">{t('movimientos.asistente.preguntaConcepto')}</p>
        <input
          type="text"
          value={borrador.descripcion}
          onChange={(evento) => onCambiar(evento.target.value)}
          placeholder={t(clavePlaceholder)}
          disabled={guardando}
          className="mt-2 w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim disabled:opacity-60"
        />
        <p className="mt-1 text-xs text-text-dim">{t('movimientos.asistente.conceptoOpcionalNota')}</p>
      </div>

      {errorGuardado && <MensajeError>{t('movimientos.formulario.errorGuardar')}</MensajeError>}

      <button
        type="submit"
        disabled={guardando}
        className="mt-1 rounded-2xl bg-mint py-3.5 text-sm font-semibold text-bg disabled:opacity-60"
      >
        {guardando
          ? t('movimientos.formulario.guardando')
          : errorGuardado
            ? t('movimientos.asistente.reintentar')
            : t('movimientos.asistente.guardarBoton')}
      </button>
    </form>
  )
}

export default PasoConcepto
