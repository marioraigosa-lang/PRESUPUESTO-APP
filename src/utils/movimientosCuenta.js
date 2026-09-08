// ¿Este movimiento representa dinero que ENTRA a `cuentaId`? Un ingreso
// siempre entra; un gasto siempre sale; un retiro también siempre sale (es
// plata que sale del sistema, no va a ninguna otra cuenta); un pago_tarjeta
// (Fase 5 del plan de tarjetas de crédito) también siempre sale -- es plata
// que se va de esta cuenta hacia una tarjeta, nunca hacia otra cuenta -- un
// traslado depende de qué lado de la cuenta se está mirando -- entra si esta
// cuenta es el destino, sale si es el origen (ver decisión de diseño: los
// traslados cuentan como ingreso/egreso "normal" desde la perspectiva de
// cada cuenta).
export function esEntradaEnCuenta(movimiento, cuentaId) {
  if (movimiento.tipo === 'ingreso') return true
  if (movimiento.tipo === 'gasto' || movimiento.tipo === 'retiro' || movimiento.tipo === 'pago_tarjeta') return false
  return movimiento.cuenta_destino_id === cuentaId
}

// Separa los movimientos del periodo de una cuenta en dos listas según la
// MISMA regla que usan los 3 totales (esEntradaEnCuenta):
//   - `entran`: plata que ENTRA a la cuenta -> ingreso + traslado donde esta
//     cuenta es el destino.
//   - `salen`: plata que SALE de la cuenta -> gasto + retiro + pago_tarjeta
//     (cuenta_id = esta cuenta) + traslado donde esta cuenta es el origen.
// El orden original (fecha desc, ver useMovimientosPeriodo) se conserva en
// cada lista. Lo usa el toggle Ingresos/Egresos de DetalleCuenta.jsx como
// herramienta de auditoría: a diferencia del detalle "resumido" anterior
// (que ocultaba los gastos normales), en "salen" SÍ están incluidos.
export function separarMovimientosCuenta(movimientos, cuentaId) {
  const entran = []
  const salen = []

  for (const movimiento of movimientos) {
    if (esEntradaEnCuenta(movimiento, cuentaId)) {
      entran.push(movimiento)
    } else {
      salen.push(movimiento)
    }
  }

  return { entran, salen }
}

// Los 3 totales del mes de una cuenta (ver DetalleCuenta.jsx): ingresos y
// egresos consideran TODOS los movimientos, con los traslados contando según
// el lado de la cuenta (esEntradaEnCuenta). Se apoya en separarMovimientosCuenta
// para no repetir esa clasificación. `neto` = ingresos - egresos.
export function calcularResumenCuenta(movimientos, cuentaId) {
  const { entran, salen } = separarMovimientosCuenta(movimientos, cuentaId)

  const sumarMontos = (lista) => lista.reduce((total, movimiento) => total + movimiento.monto, 0)
  const totalIngresos = sumarMontos(entran)
  const totalEgresos = sumarMontos(salen)

  return { totalIngresos, totalEgresos, neto: totalIngresos - totalEgresos }
}

// Texto del movimiento tal como debe verse desde la perspectiva de
// `cuentaContextoId` (pantallas de detalle de una cuenta puntual, ver
// DetalleCuenta.jsx). Solo los traslados cambian: el resto de tipos
// siempre se ven igual, se esté mirando "desde afuera" (Home) o "desde
// adentro" de una cuenta. Se exporta aparte de <Movimiento> para que la
// pantalla que lo usa pueda armar el mismo texto en su diálogo de
// confirmación de borrado, sin duplicar la lógica de "¿es origen o
// destino?".
export function descripcionEnContexto(movimiento, cuentaContextoId, t) {
  if (movimiento.tipo !== 'traslado' || !cuentaContextoId) return movimiento.descripcion

  const esOrigen = movimiento.cuenta_id === cuentaContextoId
  return esOrigen
    ? t('cuentas.detalle.trasladoA', { cuenta: movimiento.cuentaDestino ?? t('home.cuentaEliminada') })
    : t('cuentas.detalle.trasladoDesde', { cuenta: movimiento.cuenta ?? t('home.cuentaEliminada') })
}
