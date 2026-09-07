// Servicio de tarjetas de crédito: lógica de negocio (llamadas a Supabase,
// validaciones) sin estado de React. App.jsx sigue siendo dueño del estado
// (setTarjetas) y aplica los resultados que estas funciones devuelven.
//
// `datosUsuario` es el objeto { usuarioId, seleccionarPropio, insertarPropio,
// actualizarPropio, eliminarPropio } que App.jsx obtiene de
// useDatosUsuario(). No se llama al hook aquí porque estas son funciones
// normales, no componentes ni hooks -- mismo criterio que services/cuentas.js.
//
// archivarTarjeta (antes eliminarTarjeta con reasignación) NO borra nada: una
// tarjeta con historial nunca se puede borrar sin dejar movimientos huérfanos
// o reescribir el pasado. En vez de eso la ARCHIVA -- un UPDATE simple de
// "archivada_en", sujeto a RLS -- y la tarjeta deja de aparecer en la vista
// "tarjetas_con_deuda" (ver sql/supabase_archivar_tarjetas.sql). El historial
// de movimientos queda intacto.
//
// A diferencia de "saldo_inicial" en cuentas.js, "cupo_total" NO se bloquea
// cuando la tarjeta ya tiene movimientos -- no es un ancla de un cálculo
// acumulativo, así que cambiarlo no descuadra nada. La única regla es que no
// puede bajar por debajo de la deuda actual (dejaría "cupo_disponible"
// negativo en la vista "tarjetas_con_deuda", ver
// sql/supabase_tarjetas_movimientos.sql) -- se valida acá, del lado del
// servicio, además de en el formulario (HojaTarjeta.jsx), para que la regla
// se cumpla sin importar desde dónde se llame.

export function ordenarPorDeuda(lista) {
  return [...lista].sort((a, b) => b.deuda - a.deuda)
}

export async function agregarTarjeta(datosUsuario, { nombre, color, cupoTotal }) {
  const inicial = nombre.trim().charAt(0).toUpperCase()

  const { data, error } = await datosUsuario
    .insertarPropio('tarjetas', {
      nombre: nombre.trim(),
      color,
      inicial,
      cupo_total: cupoTotal,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}

// `deudaActual` viaja desde HojaTarjeta.jsx (que la lee de la tarjeta que
// está editando, cargada desde "tarjetas_con_deuda") -- mismo criterio que
// `cantidadMovimientos` en services/cuentas.js/actualizarCuenta: el servicio
// no vuelve a consultar la base para saber la deuda, confía en el valor que
// ya tiene quien llama, pero SIEMPRE valida contra él antes de escribir.
export async function actualizarTarjeta(datosUsuario, id, { nombre, color, cupoTotal, deudaActual }) {
  if (cupoTotal < (deudaActual ?? 0)) {
    throw new Error('El cupo total no puede ser menor que la deuda actual de la tarjeta.')
  }

  const inicial = nombre.trim().charAt(0).toUpperCase()

  const { data, error } = await datosUsuario
    .actualizarPropio('tarjetas', {
      nombre: nombre.trim(),
      color,
      inicial,
      cupo_total: cupoTotal,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}

// Tolerancia de medio centavo para tratar la deuda calculada como "0" -- la
// misma que usa GestionTarjetas.jsx (EPSILON_DEUDA) y la que usaba la RPC de
// reasignación. "monto" es numeric(14,2) y la suma es exacta en Postgres, así
// que "!= 0" alcanzaría; medio centavo es un cinturón extra sin costo.
const EPSILON_DEUDA = 0.005

// Códigos conocidos que archivarTarjeta propaga tal cual como `Error.message`.
// GestionTarjetas.jsx los mapea a un texto traducido: TARJETA_DEUDA_NO_CERO
// tiene mensaje propio, cualquier otro fallo cae en TARJETA_ARCHIVAR_ERROR
// (el genérico).
const CODIGOS_ERROR_ARCHIVAR = new Set(['SIN_SESION', 'TARJETA_DEUDA_NO_CERO'])

// Archiva una tarjeta: la marca con "archivada_en = ahora" y así deja de
// aparecer en la vista "tarjetas_con_deuda" (Home, Gestión, selector al
// gastar). NO borra nada -- los gastos y pagos de la tarjeta quedan intactos
// en "movimientos" y se siguen viendo en DetalleCuenta/DetalleCategoria/
// Resumen con su 💳 + nombre. Ver sql/supabase_archivar_tarjetas.sql.
//
// Regla (igual que un banco): solo se archiva con deuda EXACTAMENTE 0 (ni
// deuda pendiente ni saldo a favor). Se valida DOS veces:
//   1. Check de primera línea contra `tarjeta.deuda` (lo que ya está en
//      pantalla) -- feedback instantáneo, sin viajar a la base.
//   2. Revalidación contra la vista "tarjetas_con_deuda" -- el valor de la UI
//      puede estar viejo si entró un gasto/pago desde otra sesión desde que
//      se cargó la lista. Es lo que reemplaza la revalidación que antes hacía
//      la RPC desde dentro de la transacción.
// Recién si las dos pasan se hace el UPDATE.
export async function archivarTarjeta(datosUsuario, tarjeta) {
  if (!datosUsuario?.usuarioId) {
    throw new Error('SIN_SESION')
  }

  if (Math.abs(tarjeta?.deuda ?? 0) >= EPSILON_DEUDA) {
    throw new Error('TARJETA_DEUDA_NO_CERO')
  }

  const { data: deudaActual, error: errorDeuda } = await datosUsuario
    .seleccionarPropio('tarjetas_con_deuda', 'deuda')
    .eq('id', tarjeta.id)
    .single()

  if (errorDeuda) {
    throw new Error('TARJETA_ARCHIVAR_ERROR', { cause: errorDeuda })
  }

  if (Math.abs(deudaActual?.deuda ?? 0) >= EPSILON_DEUDA) {
    throw new Error('TARJETA_DEUDA_NO_CERO')
  }

  const { error } = await datosUsuario
    .actualizarPropio('tarjetas', { archivada_en: new Date().toISOString() })
    .eq('id', tarjeta.id)

  if (error) {
    const codigo = CODIGOS_ERROR_ARCHIVAR.has(error.message) ? error.message : 'TARJETA_ARCHIVAR_ERROR'
    throw new Error(codigo, { cause: error })
  }
}
