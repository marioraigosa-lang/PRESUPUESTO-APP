// Totales del acordeón de Gastos Variables para el periodo seleccionado.
// Recibe las categorías ya combinadas con lo gastado en el periodo (ver
// `categorias` en GastosVariables.jsx) y resume el total gastado, el total
// de los topes definidos (solo categorías con presupuesto > 0) y si ese
// tope total fue excedido. `cantidadConTope` viaja junto a los totales (en
// vez de recalcularse aparte en el componente) porque sale del mismo
// filtro que ya usa `totalTope`.
export function calcularResumenGastosVariables(categorias) {
  const totalGastado = categorias.reduce((suma, categoria) => suma + categoria.gastado, 0)
  const categoriasConTope = categorias.filter((categoria) => Boolean(categoria.presupuesto))
  const totalTope = categoriasConTope.reduce((suma, categoria) => suma + categoria.presupuesto, 0)
  const excedidoTotal = totalTope > 0 && totalGastado > totalTope

  return { totalGastado, totalTope, excedidoTotal, cantidadConTope: categoriasConTope.length }
}
