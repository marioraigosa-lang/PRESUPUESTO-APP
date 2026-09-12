// Fuente de verdad declarativa de los pasos del asistente de crear viaje.
// Función PURA, mismo espíritu que los otros dos asistentes -- pero sin
// ninguna regla de salto: a diferencia de un movimiento o un gasto de viaje
// (que pueden traer una cuenta/categoría YA decidida desde afuera), crear un
// viaje siempre arranca de cero, así que el orden es siempre el mismo.
export function flujosViaje() {
  return ['origenDestino', 'fechas', 'personas', 'categorias']
}
