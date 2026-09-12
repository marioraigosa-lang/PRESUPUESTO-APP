import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import { useIdioma } from '../../context/IdiomaContext'
import { formatearMonto } from '../../utils/formatoMoneda'
import { fechaCortaDesdeISO } from '../../utils/formatoFecha'
import { flujosGastoViaje } from './flujosGastoViaje'
import { reductorGastoViaje, estadoInicialGastoViaje } from './reductorGastoViaje'
import PasoCategoriaGastoViaje from './pasos/PasoCategoriaGastoViaje'
import PasoMontoGastoViaje from './pasos/PasoMontoGastoViaje'
import PasoConceptoGastoViaje from './pasos/PasoConceptoGastoViaje'

// Contenedor del asistente de gasto de viaje paso a paso. Mismo SHELL VISUAL
// que AsistenteMovimiento.jsx (panel mediano centrado, header con
// volver/cerrar, puntos de progreso, animación paso-entrar) -- COPIADO y
// ADAPTADO, no compartido: "gastos_viaje" es un dominio aparte de
// "movimientos" (ver services/gastosViaje.js), con su propio reducer/flujos/
// pasos (Fase VIAJE-D del plan de viajes). Detrás de
// USAR_ASISTENTE_GASTO_VIAJE (ver utils/flags.js).
//
// Reemplaza a HojaNuevoGastoViaje.jsx para CREAR (nunca para editar) desde
// "+ Agregar gasto" en DetalleCategoriaViaje.jsx -- mismo criterio que el
// asistente de movimiento con HojaNuevoMovimiento: la hoja vieja se queda
// para EDITAR un gasto existente, sin importar el flag (este asistente
// todavía no soporta edición). `onGuardar` es la MISMA función que recibe
// HojaNuevoGastoViaje ahí (agregarGasto en DetalleViaje.jsx): el asistente
// arma el mismo objeto `datos` y entra por la misma cadena de guardado
// (services/gastosViaje.js), sin duplicar nada de esa lógica acá.
function AsistenteGastoViaje({ abierta, onCerrar, categorias, onGuardar, categoriaPreseleccionadaId }) {
  const { t, idioma } = useIdioma()

  // Si el viaje solo tiene una categoría propia, no tiene sentido pararse a
  // elegirla -- mismo criterio que "una sola cuenta" en
  // asistente-movimiento/flujos.js, pero resuelto ACÁ (en vez de en
  // flujosGastoViaje.js) para que ese salto también precargue categoriaId:
  // flujosGastoViaje.js solo mira categoriaPreseleccionadaId, no cuenta las
  // categorías por su cuenta.
  const categoriaPreseleccionadaEfectiva =
    categoriaPreseleccionadaId || (categorias.length === 1 ? categorias[0].id : '')

  const preselecciones = { categoriaPreseleccionadaId: categoriaPreseleccionadaEfectiva }

  const [borrador, dispatch] = useReducer(reductorGastoViaje, preselecciones, estadoInicialGastoViaje)
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState(false)

  // Dirección de la última transición, solo para la animación de entrada del
  // paso actual -- no es parte del borrador, es puramente visual.
  const [direccion, setDireccion] = useState('adelante')

  // Cada vez que el asistente se abre, arranca de cero (con las
  // preselecciones vigentes en ese momento) -- mismo criterio que
  // AsistenteMovimiento.jsx.
  useEffect(() => {
    if (!abierta) return
    setDireccion('adelante')
    setGuardando(false)
    setErrorGuardado(false)
    dispatch({ tipo: 'REINICIAR', preselecciones })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta])

  const pasos = useMemo(() => flujosGastoViaje(borrador), [borrador])
  const indiceSeguro = Math.min(borrador.indicePaso, pasos.length - 1)
  const pasoActual = pasos[indiceSeguro]

  function manejarCerrar() {
    // Mientras hay un guardado en curso no se cierra -- mismo criterio que
    // AsistenteMovimiento.jsx: esperar a que la promesa resuelva.
    if (guardando) return

    // Con el borrador prácticamente vacío cierra directo; si el usuario ya
    // avanzó al menos un paso o ya escribió monto/descripción, confirma para
    // no perder ese progreso por un toque accidental en el backdrop.
    const hayDatos = borrador.indicePaso > 0 || Boolean(borrador.monto || borrador.descripcion.trim())
    if (hayDatos && !window.confirm(t('viajes.gastoAsistente.confirmarDescartar'))) return

    dispatch({ tipo: 'REINICIAR', preselecciones })
    onCerrar()
  }

  useEffect(() => {
    if (!abierta) return

    function manejarTecla(evento) {
      if (evento.key === 'Escape') manejarCerrar()
    }

    window.addEventListener('keydown', manejarTecla)
    return () => window.removeEventListener('keydown', manejarTecla)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta, borrador.monto, borrador.descripcion, guardando])

  // Foco al cambiar de paso, para que un lector de pantalla anuncie la
  // pregunta nueva. 'monto' se salta esto porque PasoMontoGastoViaje ya
  // mueve el foco a su propio input.
  const contenedorPasoRef = useRef(null)
  useEffect(() => {
    if (pasoActual === 'monto') return
    contenedorPasoRef.current?.focus()
  }, [pasoActual])

  if (!abierta) return null

  function elegir(cambios) {
    setDireccion('adelante')
    dispatch({ tipo: 'PARCHAR', cambios })
  }

  // Actualiza un campo SIN avanzar de paso -- concepto, y moneda/fecha
  // dentro del paso de monto.
  function actualizarCampo(cambios) {
    dispatch({ tipo: 'ACTUALIZAR', cambios })
  }

  function volver() {
    if (guardando) return
    setDireccion('atras')
    dispatch({ tipo: 'RETROCEDER' })
  }

  function saltarAPaso(indice) {
    setDireccion(indice < indiceSeguro ? 'atras' : 'adelante')
    dispatch({ tipo: 'IR_A_PASO', indice })
  }

  async function manejarFinalizar() {
    // Guarda contra doble envío -- mismo criterio que AsistenteMovimiento.jsx.
    if (guardando) return

    // Mismo objeto `datos` que arma HojaNuevoGastoViaje.jsx -> manejarGuardar
    // a partir de su propio estado local: { categoriaViajeId, fecha, monto,
    // moneda, descripcion } es justo lo que espera
    // services/gastosViaje.js -> agregarGastoViaje.
    const datos = {
      categoriaViajeId: borrador.categoriaId || null,
      fecha: borrador.fecha,
      monto: Number(borrador.monto),
      moneda: borrador.moneda,
      descripcion: borrador.descripcion.trim(),
    }

    setErrorGuardado(false)
    setGuardando(true)

    try {
      // onGuardar es la misma función que recibe HojaNuevoGastoViaje
      // (DetalleViaje.jsx -> agregarGasto): entra por la misma cadena de
      // guardado sin duplicar nada de esa lógica acá.
      await onGuardar(datos)

      dispatch({ tipo: 'REINICIAR', preselecciones })
      onCerrar()
    } catch (error) {
      // El borrador NO se toca: el usuario reintenta con el mismo botón sin
      // tener que volver a capturar nada.
      console.error(error)
      setErrorGuardado(true)
      setGuardando(false)
    }
  }

  const claseAnimacion = direccion === 'adelante' ? 'paso-entrar-derecha' : 'paso-entrar-izquierda'
  const montoFormateado = borrador.monto ? formatearMonto(Number(borrador.monto), borrador.moneda) : ''
  const fechaFormateada = borrador.fecha ? fechaCortaDesdeISO(borrador.fecha, idioma) : ''

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      {/* Fondo: la app detrás queda oscurecida y difuminada para que el panel
          sea el protagonista -- mismo criterio que AsistenteMovimiento.jsx. */}
      <button
        type="button"
        aria-label={t('viajes.gastoAsistente.cerrarAria')}
        onClick={manejarCerrar}
        className="absolute inset-0 animate-[fondo-aparecer_0.2s_ease-out] bg-black/60 backdrop-blur-sm"
      />

      <div className="relative z-10 flex max-h-full w-full max-w-[400px] flex-col overflow-hidden rounded-[24px] border border-line bg-panel shadow-elevated asistente-entrar">
        <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-4">
          {indiceSeguro > 0 ? (
            <button
              type="button"
              onClick={volver}
              disabled={guardando}
              aria-label={t('viajes.gastoAsistente.volverAria')}
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-dim transition-colors hover:bg-panel-2 hover:text-text active:scale-95 disabled:opacity-40"
            >
              <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
            </button>
          ) : (
            <span className="h-9 w-9" />
          )}

          <div
            className="flex items-center gap-1.5"
            role="img"
            aria-label={t('viajes.gastoAsistente.pasoContador', { actual: indiceSeguro + 1, total: pasos.length })}
          >
            {pasos.map((_, indice) => (
              <span
                key={indice}
                aria-hidden="true"
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  indice === indiceSeguro ? 'w-5 bg-mint' : 'w-1.5 bg-panel-2'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={manejarCerrar}
            disabled={guardando}
            aria-label={t('viajes.gastoAsistente.cerrarAria')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-dim transition-colors hover:bg-panel-2 hover:text-text active:scale-95 disabled:opacity-40"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          <div key={indiceSeguro} ref={contenedorPasoRef} tabIndex={-1} className={`h-full outline-none ${claseAnimacion}`}>
            {pasoActual === 'categoria' && (
              <PasoCategoriaGastoViaje
                borrador={borrador}
                categorias={categorias}
                onElegir={(categoriaId) => elegir({ categoriaId })}
              />
            )}

            {pasoActual === 'monto' && (
              <PasoMontoGastoViaje
                borrador={borrador}
                categorias={categorias}
                pasos={pasos}
                onAvanzar={(monto) => elegir({ monto })}
                onCambiar={actualizarCampo}
              />
            )}

            {pasoActual === 'concepto' && (
              <PasoConceptoGastoViaje
                borrador={borrador}
                categorias={categorias}
                pasos={pasos}
                montoFormateado={montoFormateado}
                fechaFormateada={fechaFormateada}
                guardando={guardando}
                errorGuardado={errorGuardado}
                onCambiar={(descripcion) => actualizarCampo({ descripcion })}
                onSaltar={saltarAPaso}
                onFinalizar={manejarFinalizar}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AsistenteGastoViaje
