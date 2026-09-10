import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import { useIdioma } from '../../context/IdiomaContext'
import { construirDatosMovimiento } from '../../utils/construirDatosMovimiento'
import { flujos } from './flujos'
import { reductorAsistente, estadoInicialAsistente } from './reductorAsistente'
import { leerUltimaCuenta, leerUltimaCategoria, guardarUltimaCuenta, guardarUltimaCategoria } from './ultimoUsado'
import { idValidoEnLista } from './preselecciones'
import PasoTipo from './pasos/PasoTipo'
import PasoCuenta from './pasos/PasoCuenta'
import PasoCategoria from './pasos/PasoCategoria'
import PasoMonto from './pasos/PasoMonto'
import PasoConcepto from './pasos/PasoConcepto'

// Contenedor del asistente paso a paso. Reutiliza el mismo shell de
// bottom-sheet que HojaNuevoMovimiento (overlay + panel + animación
// "hoja-subir") para que la transición entre ambos no cambie la sensación
// general de la hoja.
//
// Fase 4: reemplaza a HojaNuevoMovimiento para CREAR (nunca para editar) en
// los 3 orígenes de creación, detrás de USAR_ASISTENTE_MOVIMIENTO (ver
// utils/flags.js): el botón "+" de Home (App.jsx), "+ Nuevo movimiento" en
// DetalleCuenta.jsx (con cuentaPreseleccionadaId) y "+ Nuevo gasto" en
// DetalleCategoria.jsx (con categoriaPreseleccionadaId -- que además fija el
// tipo en "gasto", ver estadoInicialAsistente en reductorAsistente.js).
// Editar un movimiento existente sigue yendo SIEMPRE por HojaNuevoMovimiento
// en esos 3 lugares, con o sin flag -- el asistente todavía no soporta
// edición (la Fase 5 extrae HojaEditarMovimiento).
//
// Mismas props que HojaNuevoMovimiento (menos onActualizar/movimientoEditando,
// que no aplican) para que cada llamador solo tenga que elegir cuál de los
// dos montar, sin adaptar nada más. `onGuardar` es la MISMA función que
// recibe HojaNuevoMovimiento en cada uno de esos 3 lugares (en App.jsx,
// agregarMovimiento): el asistente arma el mismo objeto `datos` con
// construirDatosMovimiento (Fase 0) y entra por la misma cadena de guardado,
// así que los hints optimistas de saldo/deuda funcionan igual.
function AsistenteMovimiento({
  abierta,
  onCerrar,
  cuentas,
  tarjetas = [],
  categorias,
  onGuardar,
  cuentaPreseleccionadaId,
  categoriaPreseleccionadaId,
}) {
  const { t } = useIdioma()

  // Blindaje contra una preselección obsoleta (ej. la cuenta/categoría se
  // borró en otra pestaña mientras esta pantalla seguía abierta): sin esto,
  // flujos.js saltaría igual el paso correspondiente (solo mira si el id es
  // truthy) dejando un id fantasma sin ningún paso donde corregirlo. Mismo
  // criterio .some(...) que ya usa elegirTipo() para las sugerencias de
  // "última cuenta/categoría usada" -- ver idValidoEnLista en
  // preselecciones.js.
  const cuentaPreseleccionadaIdValida = idValidoEnLista(cuentaPreseleccionadaId, cuentas)
  const categoriaPreseleccionadaIdValida = idValidoEnLista(categoriaPreseleccionadaId, categorias)
  const preselecciones = {
    cuentaPreseleccionadaId: cuentaPreseleccionadaIdValida,
    categoriaPreseleccionadaId: categoriaPreseleccionadaIdValida,
  }

  const [borrador, dispatch] = useReducer(reductorAsistente, preselecciones, estadoInicialAsistente)
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState(false)

  // Dirección de la última transición, solo para elegir la animación de
  // entrada del paso actual (avanzar = entra desde la derecha, volver =
  // desde la izquierda). No es parte del borrador -- es puramente visual,
  // así que no tiene sentido meterlo en el reducer.
  const [direccion, setDireccion] = useState('adelante')

  // Igual que el useEffect de precarga/limpieza de HojaNuevoMovimiento: cada
  // vez que la hoja se abre, arranca de cero (con las preselecciones
  // vigentes en ese momento).
  useEffect(() => {
    if (!abierta) return
    setDireccion('adelante')
    setGuardando(false)
    setErrorGuardado(false)
    dispatch({ tipo: 'REINICIAR', preselecciones })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta])

  const pasos = useMemo(() => flujos(borrador, { cuentas, tarjetas }), [borrador, cuentas, tarjetas])
  const indiceSeguro = Math.min(borrador.indicePaso, pasos.length - 1)
  const pasoActual = pasos[indiceSeguro]

  function manejarCerrar() {
    // Mientras hay un guardado en curso no se cierra (ni con backdrop, ni
    // con X, ni con Escape): cerrar a mitad de un guardado dejaría el
    // resultado en el aire -- mejor esperar a que la promesa resuelva (éxito
    // cierra solo, error se queda para reintentar).
    if (guardando) return

    // Con el borrador prácticamente vacío cierra directo; si el usuario ya
    // avanzó al menos un paso (indicePaso > 0 -- eligió tipo, cuenta,
    // categoría, tarjeta, origen...) o ya escribió monto/descripción,
    // confirma para no perder ese progreso por un toque accidental en el
    // backdrop. Se usa indicePaso en vez de mirar cuentaId/categoriaId/etc.
    // directo a propósito: esos campos pueden venir YA llenos por una
    // preselección (cuentaPreseleccionadaId/categoriaPreseleccionadaId) o
    // por la sugerencia de "última usada" sin que el usuario haya tocado
    // nada todavía -- confirmar en ese caso sería pedirle que confirme
    // haber "perdido" algo que ni siquiera eligió.
    const hayDatos = borrador.indicePaso > 0 || Boolean(borrador.monto || borrador.descripcion.trim())
    if (hayDatos && !window.confirm(t('movimientos.asistente.confirmarDescartar'))) return

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
  // pregunta nueva sin que el usuario tenga que ir a buscarla. Único caso
  // aparte: 'monto' se salta esto porque PasoMonto ya mueve el foco a su
  // propio input (el teclado numérico SÍ conviene abrirlo de una ahí) --
  // hacerlo también acá se lo robaría de vuelta al contenedor.
  const contenedorPasoRef = useRef(null)
  useEffect(() => {
    if (pasoActual === 'monto') return
    contenedorPasoRef.current?.focus()
  }, [pasoActual])

  if (!abierta) return null

  function avanzar() {
    setDireccion('adelante')
  }

  function elegirTipo(valor) {
    avanzar()
    // "Última cuenta/categoría usada" (ver ultimoUsado.js): se ofrece como
    // sugerencia apenas se conoce el tipo, para que el paso de cuenta (o
    // categoría, en un gasto) ya aparezca con esa opción resaltada. Una
    // preselección explícita (props) sigue ganando -- ver reductorAsistente.js.
    // Se valida contra las listas ACTUALES con idValidoEnLista (mismo
    // criterio que las preselecciones por props, ver arriba): si la cuenta o
    // categoría guardada ya no existe, no tiene sentido preseleccionar un id
    // fantasma -- se cae a "sin sugerencia" y el usuario elige a mano, como
    // si fuera la primera vez.
    const sugerencias = {
      cuentaId: idValidoEnLista(leerUltimaCuenta(valor), cuentas),
      categoriaId: valor === 'gasto' ? idValidoEnLista(leerUltimaCategoria(), categorias) : '',
    }
    dispatch({ tipo: 'ELEGIR_TIPO', valor, sugerencias })
  }

  function elegir(cambios) {
    avanzar()
    dispatch({ tipo: 'PARCHAR', cambios })
  }

  // Actualiza un campo SIN avanzar de paso -- para el concepto, que se va
  // tecleando en vez de elegirse de una lista (ver BUG 1: antes vivía solo
  // en el estado local de PasoConcepto.jsx y se perdía al desmontarse el
  // paso).
  function actualizarCampo(cambios) {
    dispatch({ tipo: 'ACTUALIZAR', cambios })
  }

  function volver() {
    // Mismo criterio que manejarCerrar: navegar a mitad de un guardado en
    // curso dejaría al usuario mirando un paso distinto justo cuando la
    // respuesta (éxito -> cierra todo; error -> vuelve a Concepto) le cae
    // encima.
    if (guardando) return
    setDireccion('atras')
    dispatch({ tipo: 'RETROCEDER' })
  }

  function saltarAPaso(indice) {
    setDireccion(indice < indiceSeguro ? 'atras' : 'adelante')
    dispatch({ tipo: 'IR_A_PASO', indice })
  }

  async function manejarFinalizar() {
    // Guarda contra doble envío: un segundo toque en "Guardar ✓" mientras la
    // promesa anterior sigue en vuelo (doble tap, o el toque que alcanzó a
    // salir antes de que el botón se deshabilitara) no debe disparar un
    // segundo movimiento.
    if (guardando) return

    // construirDatosMovimiento (Fase 0) es el MISMO helper que usa
    // HojaNuevoMovimiento.jsx -> manejarGuardar: arma exactamente el mismo
    // objeto `datos` (emoji, null según el tipo, descripción de respaldo) a
    // partir del borrador -- borrador.descripcion ya está al día (PasoConcepto
    // la despacha con ACTUALIZAR en cada tecla, ver actualizarCampo arriba),
    // así que ni siquiera hace falta pasarla aparte.
    const datos = construirDatosMovimiento(borrador, { cuentas, categorias, t })

    setErrorGuardado(false)
    setGuardando(true)

    try {
      // onGuardar es la misma función que recibe HojaNuevoMovimiento
      // (App.jsx -> agregarMovimiento): entra por la misma cadena de
      // guardado (services/movimientos.js) y dispara los mismos hints
      // optimistas de saldo/deuda, sin duplicar nada de esa lógica acá.
      await onGuardar(datos)

      // "Última cuenta/categoría usada" (ver ultimoUsado.js) se escribe SOLO
      // tras un guardado exitoso -- si falla, no hay nada que "recordar"
      // todavía. Un gasto con tarjeta no cuenta como "cuenta usada" (usó una
      // tarjeta, no una cuenta).
      const usaTarjeta = borrador.tipo === 'gasto' && borrador.origen === 'tarjeta'
      if (!usaTarjeta && borrador.cuentaId) guardarUltimaCuenta(borrador.tipo, borrador.cuentaId)
      if (borrador.tipo === 'gasto' && borrador.categoriaId) guardarUltimaCategoria(borrador.categoriaId)

      dispatch({ tipo: 'REINICIAR', preselecciones })
      onCerrar()
    } catch (error) {
      // El borrador NO se toca: el usuario reintenta con el mismo botón sin
      // tener que volver a capturar nada (mismo criterio que errorGuardado
      // en HojaNuevoMovimiento.jsx).
      console.error(error)
      setErrorGuardado(true)
      setGuardando(false)
    }
  }

  const claseAnimacion = direccion === 'adelante' ? 'paso-entrar-derecha' : 'paso-entrar-izquierda'

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label={t('movimientos.asistente.cerrarAria')}
        onClick={manejarCerrar}
        className="absolute inset-0 animate-[fondo-aparecer_0.2s_ease-out] bg-black/60"
      />

      <div className="relative z-10 flex w-full max-w-[460px] animate-[hoja-subir_0.2s_ease-out] flex-col gap-4 rounded-t-3xl border-t border-line bg-panel shadow-elevated p-5 pb-6">
        <div className="mx-auto h-1 w-10 rounded-full bg-line" />

        <div className="flex items-center justify-between">
          {indiceSeguro > 0 ? (
            <button
              type="button"
              onClick={volver}
              disabled={guardando}
              aria-label={t('movimientos.asistente.volverAria')}
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text disabled:opacity-40"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : (
            <span className="h-9 w-9" />
          )}

          <div
            className="flex items-center gap-1.5"
            role="img"
            aria-label={t('movimientos.asistente.pasoContador', { actual: indiceSeguro + 1, total: pasos.length })}
          >
            {pasos.map((_, indice) => (
              <span
                key={indice}
                aria-hidden="true"
                className={`h-1.5 rounded-full transition-all ${
                  indice === indiceSeguro ? 'w-4 bg-mint' : 'w-1.5 bg-panel-2'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={manejarCerrar}
            disabled={guardando}
            aria-label={t('movimientos.asistente.cerrarAria')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text disabled:opacity-40"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div key={indiceSeguro} ref={contenedorPasoRef} tabIndex={-1} className={`outline-none ${claseAnimacion}`}>
          {pasoActual === 'tipo' && <PasoTipo cuentas={cuentas} onElegir={elegirTipo} />}

          {(pasoActual === 'cuenta' ||
            pasoActual === 'cuentaGasto' ||
            pasoActual === 'cuentaOrigen' ||
            pasoActual === 'cuentaDestino' ||
            pasoActual === 'tarjeta' ||
            pasoActual === 'origen') && (
            <PasoCuenta
              paso={pasoActual}
              tipo={borrador.tipo}
              borrador={borrador}
              cuentas={cuentas}
              tarjetas={tarjetas}
              onElegir={elegir}
            />
          )}

          {pasoActual === 'categoria' && (
            <PasoCategoria borrador={borrador} categorias={categorias} onElegir={(categoriaId) => elegir({ categoriaId })} />
          )}

          {pasoActual === 'monto' && (
            <PasoMonto
              borrador={borrador}
              cuentas={cuentas}
              tarjetas={tarjetas}
              categorias={categorias}
              pasos={pasos}
              onAvanzar={(monto) => elegir({ monto })}
            />
          )}

          {pasoActual === 'concepto' && (
            <PasoConcepto
              borrador={borrador}
              cuentas={cuentas}
              tarjetas={tarjetas}
              categorias={categorias}
              pasos={pasos}
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
  )
}

export default AsistenteMovimiento
