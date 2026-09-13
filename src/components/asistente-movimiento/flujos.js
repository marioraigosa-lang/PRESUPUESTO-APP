// Fuente de verdad declarativa de los pasos del asistente paso a paso, por
// tipo de movimiento. Función PURA (sin React, sin estado): recibe el
// borrador actual y el contexto (cuentas/tarjetas disponibles) y devuelve el
// array ORDENADO de nombres de paso que aplican, ya con los pasos que se
// saltan filtrados fuera. AsistenteMovimiento.jsx solo indexa este array con
// `indicePaso`; no conoce reglas de negocio.
//
// Nombres de paso posibles: 'tipo', 'origen', 'cuenta', 'cuentaGasto',
// 'tarjeta', 'cuentaOrigen', 'cuentaDestino', 'categoria', 'monto',
// 'concepto', y los propios de "pagar tarjeta": 'tarjetaPago', 'montoPago',
// 'cuentaPago' (nombres distintos a 'tarjeta'/'monto'/'cuenta' a propósito,
// para que sus componentes -- PasoTarjetaPago/PasoMontoPago -- y las reglas
// de salto no se pisen con los de los otros 4 tipos).
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

  // "Pagar tarjeta": elegir cuál tarjeta pagar, cuánto (total/parcial dentro
  // de montoPago), y de qué cuenta sale la plata. Termina en 'concepto' como
  // los otros 4 (paso opcional + botón "Guardar"). La opción solo aparece en
  // PasoTipo si hay al menos una tarjeta con deuda > 0 -- una vez elegido el
  // tipo, este flujo es siempre el mismo (sin reglas de salto: 'tarjetaPago'
  // y 'cuentaPago' se preguntan siempre, aunque haya una sola opción, igual
  // que un traslado siempre pide sus 2 cuentas). El guardado reutiliza
  // services/movimientos.js -> pagarTarjeta (ver agregarMovimiento y
  // construirDatosMovimiento.js).
  pago_tarjeta: () => ['tipo', 'tarjetaPago', 'montoPago', 'cuentaPago', 'concepto'],
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

// Complementa pasosASaltar: cuando 'cuentaGasto'/'cuenta' se saltan porque
// solo hay UNA cuenta (unaSolaCuenta más arriba), esa cuenta nunca se le
// asigna a `cuentaId` -- el usuario no ve ningún paso donde elegirla, así
// que sin esto el borrador se queda con '' y el guardado revenía más tarde
// con "Selecciona una cuenta válida" (bug real, afectaba a TODO usuario con
// una sola cuenta que todavía no tuviera una "última cuenta usada" guardada
// -- ver ultimoUsado.js). AsistenteMovimiento.jsx la llama tanto al montar
// el asistente (estadoInicialAsistente) como al elegir el tipo (ELEGIR_TIPO)
// para que `cuentaId` quede bien puesto ANTES de llegar al paso de guardar,
// sin importar si ese paso terminó saltándose o no.
//
// Genérica a propósito (no solo "cuentas"): mismo criterio serviría para
// cualquier otro paso que algún día se salte por "una sola opción posible"
// -- alcanza con llamarla con esa lista. Hoy el único caso real es
// cuentas/cuentaId; tarjetas NUNCA se saltan (ver comentario de
// PASOS_POR_TIPO.pago_tarjeta arriba), así que tarjetaId no lo necesita.
export function opcionUnica(lista) {
  return lista.length === 1 ? lista[0].id : ''
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
