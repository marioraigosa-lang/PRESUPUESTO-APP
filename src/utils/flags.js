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
