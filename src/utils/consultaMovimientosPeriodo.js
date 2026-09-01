// Encadena los filtros de "movimientos de un periodo" (useMovimientosPeriodo)
// sobre el query builder de Supabase que ya viene de
// `seleccionarPropio('movimientos', COLUMNAS)`. Se extrae aparte del hook
// para poder testear la lógica condicional (qué filtros se aplican según
// qué parámetros llegaron) con un builder falso, sin depender de React ni
// de un cliente de Supabase real.
//
// - `cuentaId`: si se pasa, solo trae movimientos donde esa cuenta sea el
//   ORIGEN o el DESTINO -- así un traslado aparece en el detalle de AMBAS
//   cuentas involucradas, no solo en la de origen.
// - `categoriaId`: si se pasa, solo trae movimientos de esa categoría.
// - `limite`: si se pasa, corta el resultado a esa cantidad; si se omite,
//   trae todos los del periodo.
export function construirConsultaMovimientosPeriodo(consultaInicial, { desde, hasta, cuentaId, categoriaId, limite }) {
  let consulta = consultaInicial.gte('fecha', desde).lte('fecha', hasta)

  if (cuentaId) {
    consulta = consulta.or(`cuenta_id.eq.${cuentaId},cuenta_destino_id.eq.${cuentaId}`)
  }
  if (categoriaId) {
    consulta = consulta.eq('categoria_id', categoriaId)
  }

  consulta = consulta.order('fecha', { ascending: false }).order('creado_en', { ascending: false })

  if (limite) {
    consulta = consulta.limit(limite)
  }

  return consulta
}
