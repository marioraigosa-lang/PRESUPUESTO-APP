import { fechaCortaDesdeISO } from './formatoFecha'

// Transforma una fila cruda de la consulta de movimientos (con las uniones
// `cuenta`/`cuenta_destino` resueltas por Supabase como objetos anidados)
// al formato que consumen las pantallas: nombre de cuenta ya resuelto a
// texto (con un texto de respaldo si la cuenta fue borrada), y fecha ya
// formateada para mostrar. `cuentaDestino` queda en null (no en el texto de
// respaldo) cuando el movimiento no es un traslado o su cuenta destino ya
// no existe -- son los llamadores (<Movimiento>, descripcionEnContexto) los
// que deciden qué mostrar en ese caso.
export function mapearMovimiento(movimiento, t, idioma) {
  return {
    ...movimiento,
    cuenta: movimiento.cuenta?.nombre ?? t('home.sinCuenta'),
    cuentaDestino: movimiento.cuenta_destino?.nombre ?? null,
    fecha: fechaCortaDesdeISO(movimiento.fecha, idioma),
  }
}
