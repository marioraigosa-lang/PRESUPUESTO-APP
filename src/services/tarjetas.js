// Servicio de tarjetas de crédito: lógica de negocio (llamadas a Supabase,
// validaciones) sin estado de React. App.jsx sigue siendo dueño del estado
// (setTarjetas) y aplica los resultados que estas funciones devuelven.
//
// `datosUsuario` es el objeto { usuarioId, seleccionarPropio, insertarPropio,
// actualizarPropio, eliminarPropio } que App.jsx obtiene de
// useDatosUsuario(). No se llama al hook aquí porque estas son funciones
// normales, no componentes ni hooks -- mismo criterio que services/cuentas.js.
//
// eliminarTarjeta NO usa datosUsuario.eliminarPropio: el borrado es una
// función RPC transaccional en la base (eliminar_tarjeta_usuario), no un
// DELETE simple -- mismo criterio que services/reinicio.js.
//
// A diferencia de "saldo_inicial" en cuentas.js, "cupo_total" NO se bloquea
// cuando la tarjeta ya tiene movimientos -- no es un ancla de un cálculo
// acumulativo, así que cambiarlo no descuadra nada. La única regla es que no
// puede bajar por debajo de la deuda actual (dejaría "cupo_disponible"
// negativo en la vista "tarjetas_con_deuda", ver
// sql/supabase_tarjetas_movimientos.sql) -- se valida acá, del lado del
// servicio, además de en el formulario (HojaTarjeta.jsx), para que la regla
// se cumpla sin importar desde dónde se llame.

import { supabase } from '../lib/supabase'

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

// Códigos que puede lanzar eliminarTarjeta como `Error.message`. Los seis
// coinciden 1:1 con los `raise exception` de la función
// eliminar_tarjeta_usuario (sql/supabase_borrado_tarjetas_reasignacion.sql);
// TARJETA_ELIMINAR_ERROR es el genérico para cualquier otro fallo de la RPC.
// GestionTarjetas.jsx los mapea a un mensaje traducido: TARJETA_DEUDA_NO_CERO
// tiene texto propio, el resto cae en el genérico.
const CODIGOS_ERROR_ELIMINAR = new Set([
  'TARJETA_DEUDA_NO_CERO',
  'FALTA_CUENTA_DESTINO',
  'CUENTA_DESTINO_INVALIDA',
  'TARJETA_INVALIDA',
  'FALTA_TARJETA',
  'BORRADO_INESPERADO',
])

// Borra una tarjeta vía la RPC transaccional `eliminar_tarjeta_usuario`
// (sql/supabase_borrado_tarjetas_reasignacion.sql). NO es un DELETE simple:
// la función valida que la deuda CALCULADA (desde movimientos) sea 0,
// REASIGNA los gastos de la tarjeta a `cuentaDestinoId` (pasan de tarjeta_id
// a cuenta_id, conservando monto/fecha/categoría -> siguen contando en sus
// categorías) y BORRA los pagos (ya no hacen falta, el gasto ahora sale
// directo de la cuenta). Como deuda = 0 => Σgastos = Σpagos, el patrimonio
// total no cambia.
//
// `cuentaDestinoId` puede ser null: solo hace falta si la tarjeta tiene
// gastos. Si no tiene (o no tiene ningún movimiento), se pasa null y la RPC
// solo borra la tarjeta. GestionTarjetas.jsx (Fase 3) decide con
// `tarjeta.cantidad_gastos` si pedir la cuenta al usuario.
//
// Check de primera línea: la RPC es la fuente de verdad (revalida la deuda
// desde movimientos), pero si el valor que ya tenemos en pantalla dice que
// la deuda no es 0 -- deuda pendiente O saldo a favor -- se corta acá sin
// viajar a la base, con la misma tolerancia de medio centavo que usa la
// función.
export async function eliminarTarjeta(datosUsuario, tarjeta, cuentaDestinoId = null) {
  if (!datosUsuario?.usuarioId) {
    throw new Error('SIN_SESION')
  }

  if (Math.abs(tarjeta?.deuda ?? 0) >= 0.005) {
    throw new Error('TARJETA_DEUDA_NO_CERO')
  }

  const { error } = await supabase.rpc('eliminar_tarjeta_usuario', {
    p_tarjeta_id: tarjeta.id,
    p_cuenta_destino_id: cuentaDestinoId,
  })

  if (error) {
    const codigo = CODIGOS_ERROR_ELIMINAR.has(error.message) ? error.message : 'TARJETA_ELIMINAR_ERROR'
    throw new Error(codigo, { cause: error })
  }
}
