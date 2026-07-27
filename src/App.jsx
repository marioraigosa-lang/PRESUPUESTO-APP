import { useEffect, useRef, useState } from 'react'
import Home from './views/Home'
import Emergencia from './views/Emergencia'
import GestionCuentas from './views/GestionCuentas'
import GestionCategorias from './views/GestionCategorias'
import GestionGastosFijos from './views/GestionGastosFijos'
import Perfil from './views/Perfil'
import PantallaAuth from './views/PantallaAuth'
import NavegacionInferior from './components/NavegacionInferior'
import BotonAgregar from './components/BotonAgregar'
import HojaNuevoMovimiento from './components/HojaNuevoMovimiento'
import Resumen from './views/Resumen'
import { fechaLocalISO, fechaPagoEnPeriodo } from './utils/formatoFecha'
import { rangoFechasPeriodo } from './utils/formatoPeriodo'
import { useAuth } from './context/AuthContext'
import { useDatosUsuario } from './lib/datosUsuario'

function App() {
  const { sesion, cargando } = useAuth()
  const { seleccionarPropio, insertarPropio, actualizarPropio, eliminarPropio } = useDatosUsuario()
  const [vista, setVista] = useState('inicio')
  const [cuentas, setCuentas] = useState([])
  const [cargandoCuentas, setCargandoCuentas] = useState(true)
  const [errorCuentas, setErrorCuentas] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [cargandoCategorias, setCargandoCategorias] = useState(true)
  const [errorCategorias, setErrorCategorias] = useState(null)
  const [movimientosVersion, setMovimientosVersion] = useState(0)
  const [hojaAbierta, setHojaAbierta] = useState(false)
  const [movimientoEditando, setMovimientoEditando] = useState(null)
  const usuarioIdAnteriorRef = useRef(null)

  useEffect(() => {
    // Sin sesión todavía no hay user_id que filtrar: esperamos a que
    // useAuth() confirme la sesión antes de pedir cualquier dato.
    if (!sesion) return
    cargarCuentas()
    cargarCategorias()
  }, [sesion])

  // Cada vez que arranca una sesión nueva (login recién hecho, recarga de
  // página estando logueado, o cambio a otro usuario) volvemos a "inicio".
  // Comparamos con el id del usuario anterior (no con el objeto `sesion`
  // completo) para NO resetear la pestaña cuando Supabase simplemente
  // refresca el token en segundo plano de la misma sesión activa.
  useEffect(() => {
    const usuarioIdActual = sesion?.user?.id ?? null
    if (usuarioIdActual && usuarioIdActual !== usuarioIdAnteriorRef.current) {
      setVista('inicio')
    }
    usuarioIdAnteriorRef.current = usuarioIdActual
  }, [sesion])

  async function cargarCuentas() {
    setCargandoCuentas(true)
    setErrorCuentas(null)

    const { data, error } = await seleccionarPropio('cuentas').order('saldo', { ascending: false })

    if (error) {
      setErrorCuentas(error.message)
    } else {
      setCuentas(data)
    }

    setCargandoCuentas(false)
  }

  async function cargarCategorias() {
    setCargandoCategorias(true)
    setErrorCategorias(null)

    const { data, error } = await seleccionarPropio('categorias').order('nombre')

    if (error) {
      setErrorCategorias(error.message)
    } else {
      setCategorias(data)
    }

    setCargandoCategorias(false)
  }

  async function agregarMovimiento(datos) {
    if (datos.tipo === 'traslado') {
      return agregarTraslado(datos)
    }

    const cuenta = cuentas.find((c) => c.id === datos.cuentaId)
    if (!cuenta) {
      throw new Error('Selecciona una cuenta válida')
    }

    try {
      const { error } = await insertarPropio('movimientos', {
        tipo: datos.tipo,
        descripcion: datos.descripcion,
        monto: datos.monto,
        emoji: datos.emoji,
        cuenta_id: cuenta.id,
        categoria_id: datos.categoriaId,
        fecha: fechaLocalISO(),
      })

      if (error) throw error

      const nuevoSaldo = cuenta.saldo + (datos.tipo === 'ingreso' ? datos.monto : -datos.monto)

      const { error: errorActualizarSaldo } = await actualizarPropio('cuentas', { saldo: nuevoSaldo }).eq(
        'id',
        cuenta.id,
      )

      if (errorActualizarSaldo) throw errorActualizarSaldo

      setCuentas((actuales) =>
        actuales
          .map((c) => (c.id === cuenta.id ? { ...c, saldo: nuevoSaldo } : c))
          .sort((a, b) => b.saldo - a.saldo),
      )

      setMovimientosVersion((version) => version + 1)
    } catch (error) {
      throw new Error(error.message || 'No se pudo guardar el movimiento')
    }
  }

  // Un traslado toca DOS cuentas en vez de una: inserta el movimiento,
  // resta de la cuenta origen y suma a la cuenta destino, deshaciendo en
  // orden inverso si algún paso falla (mismo patrón de banderas que el
  // resto de operaciones de esta pantalla, aplicado a dos cuentas).
  async function agregarTraslado(datos) {
    const origen = cuentas.find((c) => c.id === datos.cuentaId)
    const destino = cuentas.find((c) => c.id === datos.cuentaDestinoId)

    if (!origen || !destino) {
      throw new Error('Selecciona cuenta de origen y de destino')
    }
    if (origen.id === destino.id) {
      throw new Error('La cuenta de origen y destino deben ser distintas')
    }

    const nuevoSaldoOrigen = origen.saldo - datos.monto
    const nuevoSaldoDestino = destino.saldo + datos.monto

    let movimientoCreado = null
    let origenActualizado = false

    try {
      const { data: insertado, error: errorInsertar } = await insertarPropio('movimientos', {
        tipo: 'traslado',
        descripcion: datos.descripcion,
        monto: datos.monto,
        emoji: datos.emoji,
        cuenta_id: origen.id,
        cuenta_destino_id: destino.id,
        categoria_id: null,
        fecha: fechaLocalISO(),
      })
        .select()
        .single()

      if (errorInsertar) throw errorInsertar
      movimientoCreado = insertado

      const { error: errorOrigen } = await actualizarPropio('cuentas', { saldo: nuevoSaldoOrigen }).eq(
        'id',
        origen.id,
      )

      if (errorOrigen) throw errorOrigen
      origenActualizado = true

      const { error: errorDestino } = await actualizarPropio('cuentas', { saldo: nuevoSaldoDestino }).eq(
        'id',
        destino.id,
      )

      if (errorDestino) {
        // No se pudo acreditar al destino: revertimos el descuento del
        // origen y borramos el movimiento para no dejar plata "perdida".
        if (origenActualizado) {
          await actualizarPropio('cuentas', { saldo: origen.saldo }).eq('id', origen.id)
        }
        await eliminarPropio('movimientos').eq('id', movimientoCreado.id)
        throw errorDestino
      }

      setCuentas((actuales) =>
        actuales
          .map((c) => {
            if (c.id === origen.id) return { ...c, saldo: nuevoSaldoOrigen }
            if (c.id === destino.id) return { ...c, saldo: nuevoSaldoDestino }
            return c
          })
          .sort((a, b) => b.saldo - a.saldo),
      )

      setMovimientosVersion((version) => version + 1)
    } catch (error) {
      throw new Error(error.message || 'No se pudo registrar el traslado')
    }
  }

  function abrirNuevoMovimiento() {
    setMovimientoEditando(null)
    setHojaAbierta(true)
  }

  function abrirEditarMovimiento(movimiento) {
    if (movimiento.gasto_fijo_id) {
      // No debería poder llegar aquí porque el botón de editar ni siquiera se
      // muestra para estos movimientos, pero por si acaso.
      return
    }
    setMovimientoEditando(movimiento)
    setHojaAbierta(true)
  }

  function cerrarHojaMovimiento() {
    setHojaAbierta(false)
    setMovimientoEditando(null)
  }

  // Edita un movimiento normal (gasto_fijo_id null) ajustando los saldos de
  // forma consistente: primero revierte el efecto original sobre su cuenta
  // original (como si se borrara) y luego aplica el efecto nuevo sobre la
  // cuenta elegida (como si se creara de nuevo). Si cambia de cuenta, ambas
  // cuentas quedan bien; si no cambia, el resultado es el mismo que aplicar
  // solo la diferencia. Cada paso que se alcanza a hacer queda registrado en
  // una bandera para poder deshacerlo si un paso posterior falla, y así
  // nunca dejar los saldos descuadrados.
  async function actualizarMovimiento(movimientoOriginal, datos) {
    if (!movimientoOriginal) {
      throw new Error('No hay movimiento para editar')
    }

    if (movimientoOriginal.gasto_fijo_id) {
      throw new Error(
        'Este movimiento viene de un gasto fijo. Para cambiarlo, desmarca el gasto fijo correspondiente.',
      )
    }

    if (movimientoOriginal.tipo === 'traslado') {
      return actualizarTraslado(movimientoOriginal, datos)
    }

    const cuentaNueva = cuentas.find((c) => c.id === datos.cuentaId)
    if (!cuentaNueva) {
      throw new Error('Selecciona una cuenta válida')
    }

    const cuentaOriginal = movimientoOriginal.cuenta_id
      ? cuentas.find((c) => c.id === movimientoOriginal.cuenta_id)
      : null
    const mismaCuenta = Boolean(cuentaOriginal) && cuentaOriginal.id === cuentaNueva.id

    const efectoOriginal = cuentaOriginal
      ? (movimientoOriginal.tipo === 'ingreso' ? movimientoOriginal.monto : -movimientoOriginal.monto)
      : 0
    const efectoNuevo = datos.tipo === 'ingreso' ? datos.monto : -datos.monto

    // Saldo objetivo de la cuenta original, después de revertir el efecto
    // del movimiento viejo (solo aplica cuando la cuenta nueva es distinta).
    const saldoOriginalRevertido = cuentaOriginal ? cuentaOriginal.saldo - efectoOriginal : null
    // Saldo objetivo de la cuenta nueva: si es la misma cuenta, es "revertir
    // y volver a aplicar" combinado en un solo número; si es otra cuenta, es
    // simplemente sumar el efecto nuevo a su saldo actual.
    const saldoCuentaNuevaFinal = mismaCuenta
      ? saldoOriginalRevertido + efectoNuevo
      : cuentaNueva.saldo + efectoNuevo

    let cuentaOriginalRevertida = false
    let cuentaNuevaActualizada = false

    try {
      if (cuentaOriginal && !mismaCuenta) {
        const { error } = await actualizarPropio('cuentas', { saldo: saldoOriginalRevertido }).eq(
          'id',
          cuentaOriginal.id,
        )

        if (error) throw error
        cuentaOriginalRevertida = true
      }

      const { error: errorCuentaNueva } = await actualizarPropio('cuentas', {
        saldo: saldoCuentaNuevaFinal,
      }).eq('id', cuentaNueva.id)

      if (errorCuentaNueva) {
        // No se pudo aplicar el efecto nuevo: si ya habíamos revertido la
        // cuenta original, la dejamos como estaba para no perder ese dinero.
        if (cuentaOriginalRevertida) {
          await actualizarPropio('cuentas', { saldo: cuentaOriginal.saldo }).eq('id', cuentaOriginal.id)
        }
        throw errorCuentaNueva
      }
      cuentaNuevaActualizada = true

      const { error: errorMovimiento } = await actualizarPropio('movimientos', {
        tipo: datos.tipo,
        descripcion: datos.descripcion,
        monto: datos.monto,
        emoji: datos.emoji,
        cuenta_id: cuentaNueva.id,
        categoria_id: datos.categoriaId,
      }).eq('id', movimientoOriginal.id)

      if (errorMovimiento) {
        // No se pudo guardar el movimiento editado: deshacemos los cambios
        // de saldo, en orden inverso, para dejar todo como estaba antes.
        if (cuentaNuevaActualizada) {
          await actualizarPropio('cuentas', { saldo: cuentaNueva.saldo }).eq('id', cuentaNueva.id)
        }
        if (cuentaOriginalRevertida) {
          await actualizarPropio('cuentas', { saldo: cuentaOriginal.saldo }).eq('id', cuentaOriginal.id)
        }
        throw errorMovimiento
      }

      setCuentas((actuales) =>
        actuales
          .map((c) => {
            if (cuentaOriginal && !mismaCuenta && c.id === cuentaOriginal.id) {
              return { ...c, saldo: saldoOriginalRevertido }
            }
            if (c.id === cuentaNueva.id) {
              return { ...c, saldo: saldoCuentaNuevaFinal }
            }
            return c
          })
          .sort((a, b) => b.saldo - a.saldo),
      )

      setMovimientosVersion((version) => version + 1)
    } catch (error) {
      throw new Error(error.message || 'No se pudo actualizar el movimiento')
    }
  }

  // Editar un traslado solo permite cambiar monto y descripción: las
  // cuentas quedan fijas (así se evita el caso mucho más delicado de tener
  // que mover el efecto entre hasta 4 cuentas distintas -- origen/destino
  // viejos y nuevos -- de una sola vez). Ajusta la DIFERENCIA entre el
  // monto viejo y el nuevo en ambas cuentas, con el mismo patrón de
  // reversión-si-falla que el resto de operaciones de esta pantalla.
  async function actualizarTraslado(movimientoOriginal, datos) {
    const origen = movimientoOriginal.cuenta_id
      ? cuentas.find((c) => c.id === movimientoOriginal.cuenta_id)
      : null
    const destino = movimientoOriginal.cuenta_destino_id
      ? cuentas.find((c) => c.id === movimientoOriginal.cuenta_destino_id)
      : null

    if (!origen || !destino) {
      throw new Error(
        'No se pudo editar: alguna de las cuentas de este traslado ya no existe. Bórralo y crea uno nuevo si hace falta.',
      )
    }

    const montoAnterior = movimientoOriginal.monto
    const nuevoSaldoOrigen = origen.saldo + montoAnterior - datos.monto
    const nuevoSaldoDestino = destino.saldo - montoAnterior + datos.monto

    let origenActualizado = false
    let destinoActualizado = false

    try {
      const { error: errorOrigen } = await actualizarPropio('cuentas', { saldo: nuevoSaldoOrigen }).eq(
        'id',
        origen.id,
      )

      if (errorOrigen) throw errorOrigen
      origenActualizado = true

      const { error: errorDestino } = await actualizarPropio('cuentas', { saldo: nuevoSaldoDestino }).eq(
        'id',
        destino.id,
      )

      if (errorDestino) {
        if (origenActualizado) {
          await actualizarPropio('cuentas', { saldo: origen.saldo }).eq('id', origen.id)
        }
        throw errorDestino
      }
      destinoActualizado = true

      const { error: errorMovimiento } = await actualizarPropio('movimientos', {
        monto: datos.monto,
        descripcion: datos.descripcion,
      }).eq('id', movimientoOriginal.id)

      if (errorMovimiento) {
        // Deshacemos los dos ajustes de saldo, en orden inverso, para
        // dejar todo como estaba antes de este intento.
        if (destinoActualizado) {
          await actualizarPropio('cuentas', { saldo: destino.saldo }).eq('id', destino.id)
        }
        if (origenActualizado) {
          await actualizarPropio('cuentas', { saldo: origen.saldo }).eq('id', origen.id)
        }
        throw errorMovimiento
      }

      setCuentas((actuales) =>
        actuales
          .map((c) => {
            if (c.id === origen.id) return { ...c, saldo: nuevoSaldoOrigen }
            if (c.id === destino.id) return { ...c, saldo: nuevoSaldoDestino }
            return c
          })
          .sort((a, b) => b.saldo - a.saldo),
      )

      setMovimientosVersion((version) => version + 1)
    } catch (error) {
      throw new Error(error.message || 'No se pudo actualizar el traslado')
    }
  }

  // Borra un movimiento normal (gasto_fijo_id null) devolviendo su efecto a
  // la cuenta ANTES de eliminar la fila: si el borrado falla, el movimiento
  // sigue existiendo y explica por qué el saldo ya cambió, y además se
  // revierte el ajuste de saldo para no dejar nada descuadrado.
  async function eliminarMovimiento(movimiento) {
    if (movimiento.gasto_fijo_id) {
      throw new Error(
        'Este movimiento viene de un gasto fijo. Para borrarlo, desmarca el gasto fijo correspondiente.',
      )
    }

    if (movimiento.tipo === 'traslado') {
      return eliminarTraslado(movimiento)
    }

    const cuenta = movimiento.cuenta_id ? cuentas.find((c) => c.id === movimiento.cuenta_id) : null

    let saldoRevertido = false
    let nuevoSaldo = cuenta ? cuenta.saldo : null

    try {
      if (cuenta) {
        nuevoSaldo = cuenta.saldo + (movimiento.tipo === 'ingreso' ? -movimiento.monto : movimiento.monto)

        const { error } = await actualizarPropio('cuentas', { saldo: nuevoSaldo }).eq('id', cuenta.id)

        if (error) throw error
        saldoRevertido = true
      }

      const { error: errorEliminar } = await eliminarPropio('movimientos').eq('id', movimiento.id)

      if (errorEliminar) {
        // No se pudo borrar: revertimos el ajuste de saldo para dejar la
        // cuenta igual que antes de este intento.
        if (saldoRevertido) {
          await actualizarPropio('cuentas', { saldo: cuenta.saldo }).eq('id', cuenta.id)
        }
        throw errorEliminar
      }

      if (saldoRevertido) {
        setCuentas((actuales) =>
          actuales
            .map((c) => (c.id === cuenta.id ? { ...c, saldo: nuevoSaldo } : c))
            .sort((a, b) => b.saldo - a.saldo),
        )
      }

      setMovimientosVersion((version) => version + 1)
    } catch (error) {
      throw new Error(error.message || 'No se pudo eliminar el movimiento')
    }
  }

  // Borra un traslado revirtiendo su efecto en AMBAS cuentas antes de
  // borrar la fila (devuelve el monto al origen, lo quita del destino). Si
  // alguna de las dos cuentas ya no existe (fue eliminada después), esa
  // parte simplemente se omite -- no hay saldo al que devolverle o
  // quitarle nada.
  async function eliminarTraslado(movimiento) {
    const origen = movimiento.cuenta_id ? cuentas.find((c) => c.id === movimiento.cuenta_id) : null
    const destino = movimiento.cuenta_destino_id
      ? cuentas.find((c) => c.id === movimiento.cuenta_destino_id)
      : null

    let origenRevertido = false
    let destinoRevertido = false
    const nuevoSaldoOrigen = origen ? origen.saldo + movimiento.monto : null
    const nuevoSaldoDestino = destino ? destino.saldo - movimiento.monto : null

    try {
      if (origen) {
        const { error } = await actualizarPropio('cuentas', { saldo: nuevoSaldoOrigen }).eq('id', origen.id)
        if (error) throw error
        origenRevertido = true
      }

      if (destino) {
        const { error } = await actualizarPropio('cuentas', { saldo: nuevoSaldoDestino }).eq('id', destino.id)
        if (error) {
          if (origenRevertido) {
            await actualizarPropio('cuentas', { saldo: origen.saldo }).eq('id', origen.id)
          }
          throw error
        }
        destinoRevertido = true
      }

      const { error: errorEliminar } = await eliminarPropio('movimientos').eq('id', movimiento.id)

      if (errorEliminar) {
        // No se pudo borrar: revertimos los ajustes de saldo para dejar
        // ambas cuentas igual que antes de este intento.
        if (destinoRevertido) {
          await actualizarPropio('cuentas', { saldo: destino.saldo }).eq('id', destino.id)
        }
        if (origenRevertido) {
          await actualizarPropio('cuentas', { saldo: origen.saldo }).eq('id', origen.id)
        }
        throw errorEliminar
      }

      setCuentas((actuales) =>
        actuales
          .map((c) => {
            if (origen && c.id === origen.id) return { ...c, saldo: nuevoSaldoOrigen }
            if (destino && c.id === destino.id) return { ...c, saldo: nuevoSaldoDestino }
            return c
          })
          .sort((a, b) => b.saldo - a.saldo),
      )

      setMovimientosVersion((version) => version + 1)
    } catch (error) {
      throw new Error(error.message || 'No se pudo eliminar el traslado')
    }
  }

  // `periodo` es { mes, anio, quincena }: el mes/año seleccionado en el
  // selector de arriba, no necesariamente el mes actual. El pago se
  // registra dentro de ESE mes (ver fechaPagoEnPeriodo). Devuelve el
  // movimiento (existente o recién creado) para que la pantalla pueda
  // actualizar su estado local sin tener que recargar todo.
  async function marcarGastoFijoPagado(gasto, cuentaId, periodo) {
    const cuenta = cuentas.find((c) => c.id === cuentaId)
    if (!cuenta) {
      throw new Error('Selecciona una cuenta válida')
    }

    const categoriaGastosFijos = categorias.find((c) => c.es_sistema)
    if (!categoriaGastosFijos) {
      throw new Error(
        'Falta la categoría de gastos fijos. Corre el script supabase_categorias_default.sql en Supabase.',
      )
    }

    const { desde, hasta } = rangoFechasPeriodo(periodo.anio, periodo.mes)
    const fecha = fechaPagoEnPeriodo(periodo.anio, periodo.mes, gasto.dia_pago)

    // Estas dos banderas nos dicen exactamente qué alcanzamos a hacer, para
    // poder deshacerlo si un paso posterior falla y así nunca dejar el
    // movimiento y el saldo desincronizados.
    let movimientoCreado = false
    let saldoDescontado = false
    let nuevoSaldo = cuenta.saldo
    let movimiento = null

    try {
      // Buscamos si este gasto fijo YA tiene un movimiento vinculado en ESTE
      // mes concreto (el índice único de la base ahora es por mes, no de por
      // vida: ver supabase_indice_mensual.sql).
      const { data: existentes, error: errorExistentes } = await seleccionarPropio('movimientos')
        .eq('gasto_fijo_id', gasto.id)
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .limit(1)

      if (errorExistentes) throw errorExistentes

      movimiento = existentes && existentes[0]

      if (!movimiento) {
        const { data: insertado, error: errorInsertar } = await insertarPropio('movimientos', {
          tipo: 'gasto',
          descripcion: gasto.nombre,
          monto: gasto.monto,
          emoji: '📌',
          cuenta_id: cuenta.id,
          categoria_id: categoriaGastosFijos.id,
          fecha,
          gasto_fijo_id: gasto.id,
        })
          .select()
          .single()

        if (errorInsertar) {
          // El código 23505 es "unique_violation": el índice único de la base
          // de datos (uno por gasto fijo POR MES) ya rechazó un duplicado
          // para este mismo mes, p. ej. por doble clic muy rápido u otra
          // pestaña marcando el mismo gasto al mismo tiempo. Se lo avisamos
          // al usuario con un mensaje claro en vez de un error genérico.
          if (errorInsertar.code === '23505') {
            throw new Error(
              `"${gasto.nombre}" ya quedó marcado como pagado este mes (probablemente desde otra pestaña). Actualiza la pantalla para verlo reflejado.`,
            )
          }
          throw errorInsertar
        }

        movimientoCreado = true
        movimiento = insertado
      }

      // Solo descontamos el saldo si el movimiento lo creamos nosotros en
      // este mismo llamado. Si ya existía este mes (lo ganó otra pestaña),
      // el saldo ya fue descontado antes.
      if (movimientoCreado) {
        nuevoSaldo = cuenta.saldo - gasto.monto

        const { error: errorDescontar } = await actualizarPropio('cuentas', { saldo: nuevoSaldo }).eq(
          'id',
          cuenta.id,
        )

        if (errorDescontar) {
          // No se pudo descontar: deshacemos el movimiento recién creado para
          // no dejar un movimiento "fantasma" sin su efecto en el saldo.
          await eliminarPropio('movimientos').eq('id', movimiento.id)
          throw errorDescontar
        }

        saldoDescontado = true
      }

      // Nota: este flag global (uno solo por gasto fijo, sin mes) queda
      // desactualizado si el mismo fijo tiene pagos en varios meses a la
      // vez; Inicio ya no lo usa para mostrar el estado (ver GastosFijos.jsx),
      // pero se sigue escribiendo para no romper la pantalla "Gestionar
      // gastos fijos", que todavía lo lee.
      const { error: errorActualizarGasto } = await actualizarPropio('gastos_fijos', { pagado: true }).eq(
        'id',
        gasto.id,
      )

      if (errorActualizarGasto) {
        // Deshacemos todo lo que alcanzamos a hacer, en orden inverso, para
        // no dejar el estado a medias (movimiento sin su descuento, etc.).
        if (saldoDescontado) {
          await actualizarPropio('cuentas', { saldo: cuenta.saldo }).eq('id', cuenta.id)
        }
        if (movimientoCreado) {
          await eliminarPropio('movimientos').eq('id', movimiento.id)
        }
        throw errorActualizarGasto
      }

      if (saldoDescontado) {
        setCuentas((actuales) =>
          actuales
            .map((c) => (c.id === cuenta.id ? { ...c, saldo: nuevoSaldo } : c))
            .sort((a, b) => b.saldo - a.saldo),
        )
      }

      setMovimientosVersion((version) => version + 1)

      return movimiento
    } catch (error) {
      throw new Error(error.message || 'No se pudo marcar el gasto fijo como pagado')
    }
  }

  // `periodo` es { mes, anio, quincena }: desmarca el pago de ESE mes
  // concreto (busca y borra solo el movimiento vinculado cuya fecha caiga
  // en ese mes), no cualquier movimiento del gasto fijo.
  async function desmarcarGastoFijoPagado(gasto, periodo) {
    try {
      const { desde, hasta } = rangoFechasPeriodo(periodo.anio, periodo.mes)

      const { data: movimientos, error: errorBuscar } = await seleccionarPropio('movimientos')
        .eq('gasto_fijo_id', gasto.id)
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .limit(1)

      if (errorBuscar) throw errorBuscar

      const movimiento = movimientos && movimientos[0]

      // Si no hay movimiento en este mes (por ejemplo, ya se había
      // desmarcado antes), no hay saldo que devolver: solo dejamos el gasto
      // como pendiente.
      if (!movimiento) {
        const { error: errorActualizarGasto } = await actualizarPropio('gastos_fijos', {
          pagado: false,
        }).eq('id', gasto.id)

        if (errorActualizarGasto) throw errorActualizarGasto

        setMovimientosVersion((version) => version + 1)
        return
      }

      // La cuenta del movimiento puede no existir en el estado local (o ya
      // no existir en absoluto). En ese caso no rompemos nada: simplemente no
      // hay saldo que devolver.
      const cuenta = movimiento.cuenta_id
        ? cuentas.find((c) => c.id === movimiento.cuenta_id)
        : null

      let saldoDevuelto = false
      let nuevoSaldo = cuenta ? cuenta.saldo : null

      // Devolvemos el saldo ANTES de borrar el movimiento: así, si algo falla
      // a mitad de camino, el movimiento sigue existiendo y explica por qué
      // el saldo ya cambió (nunca queda "el dinero desaparecido").
      if (cuenta) {
        nuevoSaldo = cuenta.saldo + movimiento.monto

        const { error: errorDevolver } = await actualizarPropio('cuentas', { saldo: nuevoSaldo }).eq(
          'id',
          cuenta.id,
        )

        if (errorDevolver) throw errorDevolver

        saldoDevuelto = true
      }

      const { error: errorEliminar } = await eliminarPropio('movimientos').eq('id', movimiento.id)

      if (errorEliminar) {
        // No se pudo borrar el movimiento: revertimos la devolución de saldo
        // para dejar la cuenta igual que antes de este intento.
        if (saldoDevuelto) {
          await actualizarPropio('cuentas', { saldo: cuenta.saldo }).eq('id', cuenta.id)
        }
        throw errorEliminar
      }

      const { error: errorActualizarGasto } = await actualizarPropio('gastos_fijos', {
        pagado: false,
      }).eq('id', gasto.id)

      if (errorActualizarGasto) {
        // Deshacemos todo: recreamos el movimiento (con los mismos datos que
        // tenía) y, si habíamos devuelto saldo, lo volvemos a descontar. Así
        // queda todo exactamente como antes de este intento.
        await insertarPropio('movimientos', {
          tipo: movimiento.tipo,
          descripcion: movimiento.descripcion,
          monto: movimiento.monto,
          emoji: movimiento.emoji,
          cuenta_id: movimiento.cuenta_id,
          categoria_id: movimiento.categoria_id,
          fecha: movimiento.fecha,
          gasto_fijo_id: gasto.id,
        })
        if (saldoDevuelto) {
          await actualizarPropio('cuentas', { saldo: cuenta.saldo }).eq('id', cuenta.id)
        }
        throw errorActualizarGasto
      }

      if (saldoDevuelto) {
        setCuentas((actuales) =>
          actuales
            .map((c) => (c.id === cuenta.id ? { ...c, saldo: nuevoSaldo } : c))
            .sort((a, b) => b.saldo - a.saldo),
        )
      }

      setMovimientosVersion((version) => version + 1)
    } catch (error) {
      throw new Error(error.message || 'No se pudo desmarcar el gasto fijo')
    }
  }

  async function agregarGastoFijo({ nombre, monto, diaPago }) {
    const { data, error } = await insertarPropio('gastos_fijos', {
      nombre: nombre.trim(),
      monto,
      dia_pago: diaPago,
      pagado: false,
    })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return data
  }

  // Si el gasto ya está pagado (tiene un movimiento vinculado), el formulario
  // bloquea el campo de monto; esta comprobación es solo un respaldo. Cambiar
  // nombre y día de pago siempre es seguro porque no tocan ningún saldo. Si
  // el nombre cambia y el gasto está pagado, lo replicamos en la descripción
  // del movimiento vinculado para que el historial no quede desincronizado.
  async function actualizarGastoFijo(gasto, { nombre, monto, diaPago }) {
    const nombreLimpio = nombre.trim()

    if (gasto.pagado && Number(monto) !== gasto.monto) {
      throw new Error('Este gasto ya está pagado. Desmarca el pago antes de cambiar el monto.')
    }

    const { data, error } = await actualizarPropio('gastos_fijos', {
      nombre: nombreLimpio,
      monto,
      dia_pago: diaPago,
    })
      .eq('id', gasto.id)
      .select()
      .single()

    if (error) throw new Error(error.message)

    if (gasto.pagado && nombreLimpio !== gasto.nombre) {
      await actualizarPropio('movimientos', { descripcion: nombreLimpio }).eq('gasto_fijo_id', gasto.id)
      setMovimientosVersion((version) => version + 1)
    }

    return data
  }

  // Si el gasto ya está pagado, primero revertimos el pago reutilizando la
  // misma función que usa el botón de "desmarcar" (devuelve el saldo a la
  // cuenta y borra el movimiento vinculado), para no duplicar esa lógica
  // delicada. Solo si eso funciona borramos el gasto fijo. Si el borrado
  // falla después, el gasto queda como pendiente (sin movimiento, sin saldo
  // descontado) en vez de quedar en un estado inconsistente.
  async function eliminarGastoFijo(gasto) {
    if (gasto.pagado) {
      await desmarcarGastoFijoPagado(gasto)
    }

    const { error } = await eliminarPropio('gastos_fijos').eq('id', gasto.id)

    if (error) throw new Error(error.message)
  }

  function ordenarPorSaldo(lista) {
    return [...lista].sort((a, b) => b.saldo - a.saldo)
  }

  async function agregarCuenta({ nombre, tipo, color, saldo, esAhorro }) {
    const inicial = nombre.trim().charAt(0).toUpperCase()

    const { data, error } = await insertarPropio('cuentas', {
      nombre: nombre.trim(),
      tipo: tipo.trim() || null,
      color,
      inicial,
      saldo,
      es_ahorro: Boolean(esAhorro),
    })
      .select()
      .single()

    if (error) throw new Error(error.message)

    setCuentas((actuales) => ordenarPorSaldo([...actuales, data]))
  }

  async function actualizarCuenta(id, { nombre, tipo, color, saldo, esAhorro }) {
    const inicial = nombre.trim().charAt(0).toUpperCase()

    const { data, error } = await actualizarPropio('cuentas', {
      nombre: nombre.trim(),
      tipo: tipo.trim() || null,
      color,
      inicial,
      saldo,
      es_ahorro: Boolean(esAhorro),
    })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)

    setCuentas((actuales) => ordenarPorSaldo(actuales.map((c) => (c.id === id ? data : c))))
  }

  async function eliminarCuenta(cuenta) {
    const { error } = await eliminarPropio('cuentas').eq('id', cuenta.id)

    if (error) throw new Error(error.message)

    setCuentas((actuales) => actuales.filter((c) => c.id !== cuenta.id))
  }

  async function alternarEsAhorro(cuenta) {
    const nuevoValor = !cuenta.es_ahorro

    setCuentas((actuales) =>
      actuales.map((c) => (c.id === cuenta.id ? { ...c, es_ahorro: nuevoValor } : c)),
    )

    const { error } = await actualizarPropio('cuentas', { es_ahorro: nuevoValor }).eq('id', cuenta.id)

    if (error) {
      setCuentas((actuales) =>
        actuales.map((c) => (c.id === cuenta.id ? { ...c, es_ahorro: cuenta.es_ahorro } : c)),
      )
      throw new Error(error.message)
    }
  }

  // La categoría del sistema (gastos fijos) se identifica por la columna
  // es_sistema, no por su nombre (nace como "Gastos fijos" o "Fixed
  // expenses" según el idioma del usuario -- ver
  // supabase_categorias_default.sql). Como el usuario puede nombrar sus
  // categorías libremente, igual bloqueamos estos dos nombres reservados
  // para que no haya confusión con una categoría que se vea igual a la del
  // sistema.
  const NOMBRES_RESERVADOS = ['gastos fijos', 'fixed expenses']
  function asegurarNombreDisponible(nombre) {
    if (NOMBRES_RESERVADOS.includes(nombre.trim().toLowerCase())) {
      throw new Error('Ese nombre está reservado para la categoría del sistema')
    }
  }

  async function agregarCategoria({ nombre, emoji, color, presupuesto, descripcion }) {
    const nombreLimpio = nombre.trim()
    asegurarNombreDisponible(nombreLimpio)

    const { data, error } = await insertarPropio('categorias', {
      nombre: nombreLimpio,
      emoji,
      color,
      presupuesto,
      descripcion: descripcion?.trim() || null,
    })
      .select()
      .single()

    if (error) throw new Error(error.message)

    setCategorias((actuales) => [...actuales, data])
  }

  async function actualizarCategoria(id, { nombre, emoji, color, presupuesto, descripcion }) {
    const categoriaActual = categorias.find((categoria) => categoria.id === id)
    if (categoriaActual?.es_sistema) {
      throw new Error('La categoría del sistema no se puede editar')
    }

    const nombreLimpio = nombre.trim()
    asegurarNombreDisponible(nombreLimpio)

    const { data, error } = await actualizarPropio('categorias', {
      nombre: nombreLimpio,
      emoji,
      color,
      presupuesto,
      descripcion: descripcion?.trim() || null,
    })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)

    setCategorias((actuales) => actuales.map((categoria) => (categoria.id === id ? data : categoria)))
    setMovimientosVersion((version) => version + 1)
  }

  async function contarMovimientosDeCategoria(categoriaId) {
    const { count, error } = await seleccionarPropio('movimientos', 'id', {
      count: 'exact',
      head: true,
    }).eq('categoria_id', categoriaId)

    if (error) throw new Error(error.message)

    return count ?? 0
  }

  async function eliminarCategoria(categoria) {
    if (categoria.es_sistema) {
      throw new Error('La categoría del sistema no se puede eliminar')
    }

    const { error } = await eliminarPropio('categorias').eq('id', categoria.id)

    if (error) throw new Error(error.message)

    setCategorias((actuales) => actuales.filter((c) => c.id !== categoria.id))
    setMovimientosVersion((version) => version + 1)
  }

  // Antes de borrar, mueve todos los movimientos de "categoria" a
  // "categoriaDestinoId" para que nunca quede un movimiento apuntando a una
  // categoría que ya no existe. Solo se elimina la categoría después de que
  // la reasignación se confirme sin errores.
  async function reasignarYEliminarCategoria(categoria, categoriaDestinoId) {
    if (categoria.es_sistema) {
      throw new Error('La categoría del sistema no se puede eliminar')
    }
    if (!categoriaDestinoId) {
      throw new Error('Selecciona una categoría destino')
    }

    const { error: errorReasignar } = await actualizarPropio('movimientos', {
      categoria_id: categoriaDestinoId,
    }).eq('categoria_id', categoria.id)

    if (errorReasignar) throw new Error(errorReasignar.message)

    const { error: errorEliminar } = await eliminarPropio('categorias').eq('id', categoria.id)

    if (errorEliminar) {
      throw new Error(
        `Los gastos se movieron pero no se pudo eliminar la categoría: ${errorEliminar.message}`,
      )
    }

    setCategorias((actuales) => actuales.filter((c) => c.id !== categoria.id))
    setMovimientosVersion((version) => version + 1)
  }

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-sm text-text-dim">Cargando...</p>
      </main>
    )
  }

  if (!sesion) {
    return <PantallaAuth />
  }

  return (
    <>
      {vista === 'inicio' && (
        <Home
          cuentas={cuentas}
          cargandoCuentas={cargandoCuentas}
          errorCuentas={errorCuentas}
          movimientosVersion={movimientosVersion}
          onGestionarCuentas={() => setVista('cuentas')}
          onGestionarCategorias={() => setVista('categorias')}
          onGestionarGastosFijos={() => setVista('gastosFijos')}
          onMarcarGastoFijoPagado={marcarGastoFijoPagado}
          onDesmarcarGastoFijoPagado={desmarcarGastoFijoPagado}
          onEditarMovimiento={abrirEditarMovimiento}
          onEliminarMovimiento={eliminarMovimiento}
        />
      )}
      {vista === 'cuentas' && (
        <GestionCuentas
          cuentas={cuentas}
          cargandoCuentas={cargandoCuentas}
          errorCuentas={errorCuentas}
          onVolver={() => setVista('inicio')}
          onAgregarCuenta={agregarCuenta}
          onActualizarCuenta={actualizarCuenta}
          onEliminarCuenta={eliminarCuenta}
          onAlternarEsAhorro={alternarEsAhorro}
        />
      )}
      {vista === 'categorias' && (
        <GestionCategorias
          categorias={categorias}
          cargandoCategorias={cargandoCategorias}
          errorCategorias={errorCategorias}
          onVolver={() => setVista('inicio')}
          onAgregarCategoria={agregarCategoria}
          onActualizarCategoria={actualizarCategoria}
          onContarMovimientos={contarMovimientosDeCategoria}
          onEliminarCategoria={eliminarCategoria}
          onReasignarYEliminarCategoria={reasignarYEliminarCategoria}
        />
      )}
      {vista === 'gastosFijos' && (
        <GestionGastosFijos
          onVolver={() => setVista('inicio')}
          onAgregarGastoFijo={agregarGastoFijo}
          onActualizarGastoFijo={actualizarGastoFijo}
          onEliminarGastoFijo={eliminarGastoFijo}
        />
      )}
      {vista === 'emergencia' && <Emergencia />}
      {vista === 'resumen' && <Resumen />}
      {vista === 'mas' && <Perfil />}

      <BotonAgregar onClick={abrirNuevoMovimiento} />

      <HojaNuevoMovimiento
        abierta={hojaAbierta}
        onCerrar={cerrarHojaMovimiento}
        cuentas={cuentas}
        categorias={categorias.filter((categoria) => !categoria.es_sistema)}
        onGuardar={agregarMovimiento}
        onActualizar={(datos) => actualizarMovimiento(movimientoEditando, datos)}
        movimientoEditando={movimientoEditando}
      />

      <NavegacionInferior vistaActiva={vista} onCambiarVista={setVista} />
    </>
  )
}

export default App
