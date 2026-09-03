// Servicio de cuentas: lógica de negocio (llamadas a Supabase, cálculos)
// sin estado de React. App.jsx sigue siendo dueño del estado (setCuentas) y
// aplica los resultados que estas funciones devuelven.
//
// `datosUsuario` es el objeto { seleccionarPropio, insertarPropio,
// actualizarPropio, eliminarPropio } que App.jsx obtiene de
// useDatosUsuario(). No se llama al hook aquí porque estas son funciones
// normales, no componentes ni hooks.

export function ordenarPorSaldo(lista) {
  return [...lista].sort((a, b) => b.saldo - a.saldo)
}

// Crea una cuenta nueva. El saldo que trae el formulario es el
// "saldo_inicial" (Fase 1 del plan de saldo calculado, ver
// sql/supabase_saldo_calculado.sql): el ancla desde la que la vista
// "cuentas_con_saldo" calcula el saldo real (saldo_inicial + efecto de sus
// movimientos), no un valor que se sobreescriba con cada movimiento. También
// se escribe en la columna vieja "saldo" -- ya NO se usa para calcular nada
// (eso lo hace la vista), pero SÍ se sigue leyendo un instante, como valor
// optimista, mientras el estado local no vuelve a cargar la vista completa
// (ver App.jsx/agregarCuenta). Al crear, ambas columnas valen lo mismo: una
// cuenta recién creada no tiene movimientos todavía, así que
// saldo = saldo_inicial + 0.
export async function agregarCuenta(datosUsuario, { nombre, tipo, color, saldoInicial, esAhorro }) {
  const inicial = nombre.trim().charAt(0).toUpperCase()

  const { data, error } = await datosUsuario
    .insertarPropio('cuentas', {
      nombre: nombre.trim(),
      tipo: tipo.trim() || null,
      color,
      inicial,
      saldo_inicial: saldoInicial,
      saldo: saldoInicial,
      es_ahorro: Boolean(esAhorro),
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}

// Edita una cuenta existente. "saldo_inicial" es el ancla del saldo
// calculado (ver agregarCuenta arriba) -- SOLO es seguro tocarla si la
// cuenta todavía no tiene ningún movimiento: cambiar el ancla de una cuenta
// que ya tiene movimientos le sumaría el ajuste ENCIMA del efecto que esos
// movimientos ya representan, descuadrando el saldo calculado (por eso
// HojaCuenta.jsx bloquea, deshabilitando el campo en la UI, cuando
// cantidad_movimientos > 0).
//
// `cantidadMovimientos` viaja como blindaje extra de este lado (no solo
// confiar en que la UI se comporte bien): si no es EXACTAMENTE 0, ni
// "saldo_inicial" ni "saldo" entran al payload del UPDATE, sin importar qué
// traiga `saldoInicial`. Ojo: sigue siendo el MISMO dato que ya cargó
// App.jsx desde "cuentas_con_saldo" -- no es una defensa contra alguien
// llamando a la API de Supabase directo con un valor falso (para eso haría
// falta un trigger en la base de datos, fuera del alcance de esta fase);
// es una defensa contra bugs/carreras accidentales del lado del cliente.
export async function actualizarCuenta(
  datosUsuario,
  id,
  { nombre, tipo, color, saldoInicial, esAhorro, cantidadMovimientos },
) {
  const inicial = nombre.trim().charAt(0).toUpperCase()

  const payload = {
    nombre: nombre.trim(),
    tipo: tipo.trim() || null,
    color,
    inicial,
    es_ahorro: Boolean(esAhorro),
  }

  if (cantidadMovimientos === 0) {
    payload.saldo_inicial = saldoInicial
    payload.saldo = saldoInicial // mismo motivo que en agregarCuenta: sin movimientos, saldo = saldo_inicial.
  }

  const { data, error } = await datosUsuario.actualizarPropio('cuentas', payload).eq('id', id).select().single()

  if (error) throw new Error(error.message)

  return data
}

export async function eliminarCuenta(datosUsuario, cuenta) {
  const { error } = await datosUsuario.eliminarPropio('cuentas').eq('id', cuenta.id)

  if (error) throw new Error(error.message)
}

// Solo hace el update en Supabase y devuelve/lanza el resultado. El cambio
// optimista en pantalla (aplicar el nuevo valor antes de esta llamada y
// revertirlo si falla) sigue en App.jsx, porque eso es estado de React.
export async function alternarEsAhorro(datosUsuario, cuenta, nuevoValor) {
  const { error } = await datosUsuario.actualizarPropio('cuentas', { es_ahorro: nuevoValor }).eq('id', cuenta.id)

  if (error) throw new Error(error.message)
}
