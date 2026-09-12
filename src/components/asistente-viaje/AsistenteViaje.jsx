import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import { useIdioma } from '../../context/IdiomaContext'
import { flujosViaje } from './flujosViaje'
import { reductorViaje, estadoInicialViaje } from './reductorViaje'
import { construirDatosViaje, categoriasElegidasDeViaje } from './construirDatosViaje'
import PasoOrigenDestino from './pasos/PasoOrigenDestino'
import PasoFechasViaje from './pasos/PasoFechasViaje'
import PasoPersonasViaje from './pasos/PasoPersonasViaje'
import PasoCategoriasViaje from './pasos/PasoCategoriasViaje'

// Contenedor del asistente de crear viaje paso a paso. Mismo SHELL VISUAL
// que AsistenteMovimiento.jsx / AsistenteGastoViaje.jsx (panel mediano
// centrado, header con volver/cerrar, puntos de progreso, animación
// paso-entrar) -- COPIADO y ADAPTADO, no compartido: "viajes" es un dominio
// propio (ver services/viajes.js), con su propio reducer/flujos/pasos (Fase
// VIAJE-E del plan de viajes). Detrás de USAR_ASISTENTE_VIAJE (ver
// utils/flags.js).
//
// Reemplaza a HojaNuevoViaje.jsx para CREAR (nunca para editar) desde
// "+ Nuevo viaje" en Viajes.jsx -- mismo criterio que los otros dos
// asistentes: la hoja vieja se queda para EDITAR un viaje existente, sin
// importar el flag (este asistente todavía no soporta edición).
//
// `onGuardar(datosViaje, categoriasElegidas)` es una función NUEVA (no la
// misma que recibe HojaNuevoViaje): además de crear el viaje, debe sembrar
// SOLO las categorías marcadas en el paso 4, cada una con su presupuesto
// (ver Viajes.jsx -> crearViajeConCategorias y
// services/categoriasViaje.js -> crearCategoriasElegidas). A diferencia de
// agregarViaje (usado por la hoja vieja), acá NO se siembran las 8
// categorías completas con presupuesto 0.
function AsistenteViaje({ abierta, onCerrar, onGuardar }) {
  const { t } = useIdioma()

  const [borrador, dispatch] = useReducer(reductorViaje, undefined, estadoInicialViaje)
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState(false)

  // Dirección de la última transición, solo para la animación de entrada del
  // paso actual -- no es parte del borrador, es puramente visual.
  const [direccion, setDireccion] = useState('adelante')

  // Cada vez que el asistente se abre, arranca de cero -- crear un viaje
  // nunca trae preselecciones (a diferencia de los otros dos asistentes).
  useEffect(() => {
    if (!abierta) return
    setDireccion('adelante')
    setGuardando(false)
    setErrorGuardado(false)
    dispatch({ tipo: 'REINICIAR' })
  }, [abierta])

  const pasos = useMemo(() => flujosViaje(), [])
  const indiceSeguro = Math.min(borrador.indicePaso, pasos.length - 1)
  const pasoActual = pasos[indiceSeguro]

  function manejarCerrar() {
    // Mientras hay un guardado en curso no se cierra -- mismo criterio que
    // los otros dos asistentes: esperar a que la promesa resuelva.
    if (guardando) return

    // Con el borrador prácticamente vacío (todavía en el paso 0, sin nada
    // escrito) cierra directo; si el usuario ya avanzó o ya escribió algo,
    // confirma para no perder ese progreso por un toque accidental en el
    // backdrop.
    const hayDatos = borrador.indicePaso > 0 || Boolean(borrador.origen || borrador.destino)
    if (hayDatos && !window.confirm(t('viajes.asistente.confirmarDescartar'))) return

    dispatch({ tipo: 'REINICIAR' })
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
  }, [abierta, borrador.indicePaso, borrador.origen, borrador.destino, guardando])

  // Foco al cambiar de paso, para que un lector de pantalla anuncie la
  // pregunta nueva. 'origenDestino' se salta esto porque PasoOrigenDestino
  // ya mueve el foco a su propio input.
  const contenedorPasoRef = useRef(null)
  useEffect(() => {
    if (pasoActual === 'origenDestino') return
    contenedorPasoRef.current?.focus()
  }, [pasoActual])

  if (!abierta) return null

  // Los 4 pasos de este asistente son todos de texto/ajuste libre (nunca
  // "elegir una opción de una lista"): el valor ya quedó sincronizado en el
  // borrador vía ACTUALIZAR mientras el usuario escribía/ajustaba (ver
  // actualizarCampo), así que avanzar acá no necesita fusionar nada más.
  function avanzar() {
    setDireccion('adelante')
    dispatch({ tipo: 'PARCHAR', cambios: {} })
  }

  // Actualiza un campo SIN avanzar de paso -- origen/destino, fechas,
  // personas, todos se van tecleando/ajustando en su propio paso.
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
    // Guarda contra doble envío -- mismo criterio que los otros dos
    // asistentes.
    if (guardando) return

    const datosViaje = construirDatosViaje(borrador, { t })
    const seleccion = categoriasElegidasDeViaje(borrador)

    setErrorGuardado(false)
    setGuardando(true)

    try {
      await onGuardar(datosViaje, seleccion)
      dispatch({ tipo: 'REINICIAR' })
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
          sea el protagonista -- mismo criterio que los otros dos asistentes. */}
      <button
        type="button"
        aria-label={t('viajes.asistente.cerrarAria')}
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
              aria-label={t('viajes.asistente.volverAria')}
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
            aria-label={t('viajes.asistente.pasoContador', { actual: indiceSeguro + 1, total: pasos.length })}
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
            aria-label={t('viajes.asistente.cerrarAria')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-dim transition-colors hover:bg-panel-2 hover:text-text active:scale-95 disabled:opacity-40"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          <div key={indiceSeguro} ref={contenedorPasoRef} tabIndex={-1} className={`h-full outline-none ${claseAnimacion}`}>
            {pasoActual === 'origenDestino' && (
              <PasoOrigenDestino borrador={borrador} onAvanzar={() => avanzar()} onCambiar={actualizarCampo} />
            )}

            {pasoActual === 'fechas' && (
              <PasoFechasViaje
                borrador={borrador}
                pasos={pasos}
                onAvanzar={() => avanzar()}
                onCambiar={actualizarCampo}
              />
            )}

            {pasoActual === 'personas' && (
              <PasoPersonasViaje
                borrador={borrador}
                pasos={pasos}
                onAvanzar={() => avanzar()}
                onCambiar={actualizarCampo}
              />
            )}

            {pasoActual === 'categorias' && (
              <PasoCategoriasViaje
                borrador={borrador}
                pasos={pasos}
                guardando={guardando}
                errorGuardado={errorGuardado}
                onAlternarCategoria={(clave) => dispatch({ tipo: 'ALTERNAR_CATEGORIA', clave })}
                onCambiarPresupuesto={(clave, presupuesto) =>
                  dispatch({ tipo: 'CAMBIAR_PRESUPUESTO_CATEGORIA', clave, presupuesto })
                }
                onCambiarMoneda={(moneda) => dispatch({ tipo: 'CAMBIAR_MONEDA_CATEGORIAS', moneda })}
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

export default AsistenteViaje
