// Fuente de verdad declarativa de los pasos del asistente paso a paso, por
// tipo de movimiento. Función PURA (sin React, sin estado): recibe el
// borrador actual y el contexto (cuentas/tarjetas disponibles) y devuelve el
// array ORDENADO de nombres de paso que aplican, ya con los pasos que se
// saltan filtrados fuera. AsistenteMovimiento.jsx solo indexa este array con
// `indicePaso`; no conoce reglas de negocio.
//
// Nombres de paso posibles: 'tipo', 'origen', 'cuenta', 'cuentaGasto',
// 'tarjeta', 'cuentaOrigen', 'cuentaDestino', 'categoria', 'monto',
// 'concepto'.
const PASOS_POR_TIPO = {
  ingreso: () => ['tipo', 'cuenta', 'monto', 'concepto'],

  // 'origen' (cuenta vs tarjeta) solo tiene sentido si el usuario tiene
  // tarjetas -- sin tarjetas, un gasto siempre sale de una cuenta, igual que
  // en HojaNuevoMovimiento. El paso siguiente depende de lo que se haya
  // elegido ahí (o del valor por defecto 'cuenta' mientras no se ha elegido).
  gasto: ({ tarjetas, origen }) => [
    'tipo',
    ...(tarjetas.length > 0 ? ['origen'] : []),
    origen === 'tarjeta' ? 'tarjeta' : 'cuentaGasto',
    'categoria',
    'monto',
    'concepto',
  ],

  // A diferencia de ingreso/gasto/retiro, un traslado SIEMPRE necesita elegir
  // 2 cuentas distintas -- por eso cuentaOrigen/cuentaDestino no entran en la
  // regla de "una sola cuenta -> saltar" de abajo.
  traslado: () => ['tipo', 'cuentaOrigen', 'cuentaDestino', 'monto', 'concepto'],

  retiro: () => ['tipo', 'cuenta', 'monto', 'concepto'],
}

// Pasos que se saltan según el borrador y el contexto. Devuelve un Set de
// nombres de paso a excluir del resultado de PASOS_POR_TIPO.
function pasosASaltar(borrador, { cuentas }) {
  const saltar = new Set()

  // El tipo viene decidido de antemano cuando una categoría también lo está
  // (una categoría solo existe para un gasto -- ver estadoInicialAsistente
  // en reductorAsistente.js): "+ Nuevo gasto" desde DetalleCategoria.jsx.
  if (borrador.tipoPreseleccionado) {
    saltar.add('tipo')
  }

  // Con una sola cuenta no hay nada que elegir: no tiene sentido pararse en
  // un paso con una única opción ya seleccionada.
  const unaSolaCuenta = cuentas.length === 1
  const hayCuentaPreseleccionada = Boolean(borrador.cuentaPreseleccionadaId)
  if (unaSolaCuenta || hayCuentaPreseleccionada) {
    saltar.add('cuenta')
    saltar.add('cuentaGasto')
  }
  // La preselección de cuenta (ej. entrar al asistente desde el detalle de
  // una cuenta) fija el ORIGEN del traslado; el destino lo sigue eligiendo
  // el usuario.
  if (hayCuentaPreseleccionada) {
    saltar.add('cuentaOrigen')
  }

  if (borrador.categoriaPreseleccionadaId) {
    saltar.add('categoria')
  }

  return saltar
}

export function flujos(borrador, contexto) {
  const { cuentas = [], tarjetas = [] } = contexto
  const generador = PASOS_POR_TIPO[borrador.tipo]

  // Sin tipo elegido todavía (arranque del asistente), el único paso posible
  // es elegirlo.
  if (!generador) return ['tipo']

  const pasosBase = generador({ tarjetas, origen: borrador.origen })
  const saltar = pasosASaltar(borrador, { cuentas, tarjetas })

  return pasosBase.filter((paso) => !saltar.has(paso))
}
