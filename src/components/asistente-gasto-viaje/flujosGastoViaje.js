// Fuente de verdad declarativa de los pasos del asistente de gasto de viaje.
// Función PURA (sin React, sin estado), mismo espíritu que
// asistente-movimiento/flujos.js pero mucho más simple: un gasto de viaje es
// siempre "una sola forma" (no hay tipos distintos como ingreso/gasto/
// traslado/retiro/pago_tarjeta) -- la única variación es si el paso de
// categoría se salta o no.
export function flujosGastoViaje(borrador) {
  const pasos = ['categoria', 'monto', 'concepto']

  // La categoría viene decidida de antemano cuando se entra desde
  // "+ Agregar gasto" dentro de una categoría (DetalleCategoriaViaje.jsx) --
  // hoy el único punto de entrada -- o cuando el viaje solo tiene una
  // categoría propia (ver AsistenteGastoViaje.jsx, que calcula la
  // preselección efectiva antes de armar el borrador inicial).
  if (borrador.categoriaPreseleccionadaId) {
    return pasos.filter((paso) => paso !== 'categoria')
  }

  return pasos
}
