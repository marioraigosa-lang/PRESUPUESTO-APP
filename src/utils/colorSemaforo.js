// Colores de semáforo para las barras de progreso del resumen colapsado de
// Home.jsx (Gastos variables, Gastos fijos, Tarjetas). Dos funciones porque
// el sentido de "lleno" es opuesto según la sección:
//
// - colorSemaforoLlenado: para Gastos variables (gastado/presupuesto) y
//   Tarjetas (deuda/cupo) -- MÁS LLENO = PEOR. Umbrales: <70% vas bien
//   (mint), 70-90% atención (gold), >90% límite o excedido (coral). >100%
//   (presupuesto/cupo excedido) sigue cayendo en coral, no hace falta un
//   cuarto nivel.
//
// - colorSemaforoPagado: para Gastos fijos (pagado/total) -- MÁS LLENO =
//   MEJOR, semáforo INVERTIDO respecto al de arriba. Umbrales: <50% todavía
//   falta la mayoría (coral), 50-99% a medio camino (gold), 100% todo al día
//   (mint).
//
// Los colores son los tokens de tema ya usados en el resto de la app (ver
// index.css), no hex sueltos, para que respondan igual a un futuro cambio de
// paleta.
const MINT = 'var(--color-mint)'
const GOLD = 'var(--color-gold)'
const CORAL = 'var(--color-coral)'

export function colorSemaforoLlenado(porcentaje) {
  if (porcentaje > 90) return CORAL
  if (porcentaje >= 70) return GOLD
  return MINT
}

export function colorSemaforoPagado(porcentaje) {
  if (porcentaje >= 100) return MINT
  if (porcentaje >= 50) return GOLD
  return CORAL
}
