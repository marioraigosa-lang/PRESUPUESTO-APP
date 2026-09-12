// Flag oculto de desarrollo para el asistente de movimiento paso a paso
// (components/asistente-movimiento/). En `true`, CREAR un movimiento nuevo
// abre el asistente en vez del formulario de siempre (HojaNuevoMovimiento)
// en los 3 lugares donde se crea: el botón "+" de Home (App.jsx),
// "+ Nuevo movimiento" en DetalleCuenta.jsx, y "+ Nuevo gasto" en
// DetalleCategoria.jsx. EDITAR un movimiento existente sigue yendo SIEMPRE
// por HojaNuevoMovimiento en los 3 lugares, sin importar este flag -- el
// asistente todavía no soporta edición (ver AsistenteMovimiento.jsx).
// DetalleTarjeta.jsx no crea movimientos (solo edita), así que no lo usa.
//
// Un solo valor acá controla los 3 orígenes de creación a la vez. Se cambia
// a mano en este archivo, nunca por env var ni por UI, para que no quede
// ninguna forma de prender el asistente en producción por accidente.
export const USAR_ASISTENTE_MOVIMIENTO = true

// Mismo criterio que USAR_ASISTENTE_MOVIMIENTO, pero para el asistente de
// gasto de viaje paso a paso (components/asistente-gasto-viaje/, Fase
// VIAJE-D). En `true`, CREAR un gasto de viaje abre el asistente en vez del
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
