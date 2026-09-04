import { fechaCortaDesdeISO } from './formatoFecha'

// Transforma una fila cruda de la consulta de movimientos (con las uniones
// `cuenta`/`cuenta_destino`/`tarjeta` resueltas por Supabase como objetos
// anidados) al formato que consumen las pantallas: nombre de cuenta ya
// resuelto a texto (con un texto de respaldo si la cuenta fue borrada), y
// fecha ya formateada para mostrar. `cuentaDestino` queda en null (no en el
// texto de respaldo) cuando el movimiento no es un traslado o su cuenta
// destino ya no existe -- son los llamadores (<Movimiento>,
// descripcionEnContexto) los que deciden qué mostrar en ese caso.
//
// Un gasto con tarjeta (Fase 4 del plan de tarjetas de crédito) siempre
// tiene cuenta_id null, así que `movimiento.cuenta` (la unión) también
// llega null -- se usa el nombre de la tarjeta como respaldo ANTES del
// texto genérico "Sin cuenta", para que <Movimiento> siga mostrando "de
// dónde salió la plata" sin tener que distinguir cuenta/tarjeta por
// separado.
export function mapearMovimiento(movimiento, t, idioma) {
  return {
    ...movimiento,
    cuenta: movimiento.cuenta?.nombre ?? movimiento.tarjeta?.nombre ?? t('home.sinCuenta'),
    cuentaDestino: movimiento.cuenta_destino?.nombre ?? null,
    fecha: fechaCortaDesdeISO(movimiento.fecha, idioma),
  }
}
