// Flag oculto de desarrollo para el asistente de gasto de viaje paso a paso
// (components/asistente-gasto-viaje/, Fase VIAJE-D). Mismo criterio que
// tenía USAR_ASISTENTE_MOVIMIENTO (retirado: el asistente de movimiento ya
// es el único camino de creación, sin formulario viejo al que hacer fallback
// -- ver AsistenteMovimiento.jsx / HojaEditarMovimiento.jsx). En `true`, CREAR
// un gasto de viaje abre el asistente en vez del
// formulario de siempre (HojaNuevoGastoViaje) en los 2 lugares donde se
// crea: "+ Agregar gasto" en DetalleCategoriaViaje.jsx (con categoría
// preseleccionada) y el FAB flotante de DetalleViaje.jsx (sin preseleccionar
// -- arranca en el paso de elegir categoría). EDITAR un gasto existente
// sigue yendo SIEMPRE por HojaNuevoGastoViaje, sin importar este flag -- el
// asistente todavía no soporta edición.
export const USAR_ASISTENTE_GASTO_VIAJE = true

// Mismo criterio, para el asistente de CREAR viaje paso a paso
// (components/asistente-viaje/, Fase VIAJE-E). En `true`, "+ Nuevo viaje" en
// Viajes.jsx abre el asistente en vez del formulario de siempre
// (HojaNuevoViaje). EDITAR un viaje existente sigue yendo SIEMPRE por
// HojaNuevoViaje, sin importar este flag -- el asistente todavía no soporta
// edición.
export const USAR_ASISTENTE_VIAJE = true
