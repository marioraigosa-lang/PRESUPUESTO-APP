// Cálculo puro del progreso de una categoría de gasto variable contra su
// presupuesto mensual. Compartido entre CategoriaGasto.jsx (la fila dentro
// de "Gastos variables" en Home) y DetalleCategoria.jsx (Fase 2 de
// "categorías navegables"), para que ambas pantallas midan "excedido" y el
// porcentaje de la barra exactamente igual -- antes esta cuenta vivía
// duplicada a mano dentro de CategoriaGasto.jsx.
export function calcularProgresoPresupuesto(presupuesto, gastado) {
  const tieneTope = Boolean(presupuesto)
  const excedido = tieneTope && gastado > presupuesto
  const porcentaje = tieneTope ? Math.min(100, Math.round((gastado / presupuesto) * 100)) : 0

  return { tieneTope, excedido, porcentaje }
}
