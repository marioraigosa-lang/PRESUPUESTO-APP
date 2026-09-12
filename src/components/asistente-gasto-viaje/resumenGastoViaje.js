import { resolverIconoCategoria } from '../../utils/resolverIconoCategoria'

// Arma los chips del mini-resumen que PasoMontoGastoViaje y
// PasoConceptoGastoViaje muestran arriba de la pantalla ("[icono] Comida ·
// $45.000"). Función PURA, mismo espíritu que
// asistente-movimiento/resumen.js -> chipsResumen: decide solo QUÉ mostrar y
// a qué nombre de paso saltaría cada chip si se toca --
// ResumenBorradorGastoViaje.jsx es quien decide si de verdad se puede tocar
// (un chip solo es tocable si ese paso sigue existiendo en `pasos`, ver
// flujosGastoViaje.js).
//
// `fechaFormateada` (a diferencia de categoría/monto) no tiene paso propio
// -- se ajusta dentro de 'monto', ver PasoMontoGastoViaje.jsx -- así que su
// chip se arma SIN `paso`: queda como texto informativo, nunca tocable.
export function chipsResumenGastoViaje(borrador, { categorias = [], montoFormateado, fechaFormateada }) {
  const chips = []

  const categoria = categorias.find((categoria) => categoria.id === borrador.categoriaId)
  if (categoria) {
    chips.push({
      paso: 'categoria',
      texto: categoria.nombre,
      icono: resolverIconoCategoria(categoria),
      color: categoria.color,
    })
  }

  if (montoFormateado) {
    chips.push({ paso: 'monto', texto: montoFormateado })
  }

  if (fechaFormateada) {
    chips.push({ texto: fechaFormateada })
  }

  return chips
}
