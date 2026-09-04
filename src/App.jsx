import { useEffect, useRef, useState } from 'react'
import Home from './views/Home'
import Emergencia from './views/Emergencia'
import GestionCuentas from './views/GestionCuentas'
import GestionTarjetas from './views/GestionTarjetas'
import GestionCategorias from './views/GestionCategorias'
import GestionGastosFijos from './views/GestionGastosFijos'
import Perfil from './views/Perfil'
import PantallaAuth from './views/PantallaAuth'
import EstablecerNuevaContrasena from './views/EstablecerNuevaContrasena'
import VerificarMfa from './views/VerificarMfa'
import PantallaConsentimiento from './views/PantallaConsentimiento'
import OnboardingCuenta from './views/OnboardingCuenta'
import NavegacionInferior from './components/NavegacionInferior'
import BotonAgregar from './components/BotonAgregar'
import HojaNuevoMovimiento from './components/HojaNuevoMovimiento'
import GuiaBienvenida from './components/GuiaBienvenida'
import Resumen from './views/Resumen'
import Viajes from './views/Viajes'
import { useAuth } from './context/AuthContext'
import { useMoneda } from './context/MonedaContext'
import { useIdioma } from './context/IdiomaContext'
import { useGuia } from './context/GuiaContext'
import { useDatosUsuario } from './lib/datosUsuario'
import * as categoriasService from './services/categorias'
import * as cuentasService from './services/cuentas'
import * as tarjetasService from './services/tarjetas'
import * as movimientosService from './services/movimientos'
import * as gastosFijosService from './services/gastosFijos'
import * as reinicioService from './services/reinicio'

// Pantalla de carga mínima compartida por los gates de App.jsx (sesión y,
// más abajo, cuentas): mismo look en ambos casos, sin duplicar el markup.
function PantallaCargando() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg">
      <p className="text-sm text-text-dim">Cargando...</p>
    </main>
  )
}

function App() {
  const { sesion, cargando, recuperacion, requiereVerificacionMfa, requiereConsentimiento } = useAuth()
  const { cargando: cargandoMoneda } = useMoneda()
  const { cargando: cargandoIdioma } = useIdioma()
  const { guiaVista, cargando: cargandoGuia } = useGuia()
  const datosUsuario = useDatosUsuario()
  const { seleccionarPropio } = datosUsuario
  const [vista, setVista] = useState('inicio')
  const [cuentas, setCuentas] = useState([])
  const [cargandoCuentas, setCargandoCuentas] = useState(true)
  const [errorCuentas, setErrorCuentas] = useState(null)
  const [tarjetas, setTarjetas] = useState([])
  const [cargandoTarjetas, setCargandoTarjetas] = useState(true)
  const [errorTarjetas, setErrorTarjetas] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [cargandoCategorias, setCargandoCategorias] = useState(true)
  const [errorCategorias, setErrorCategorias] = useState(null)
  const [movimientosVersion, setMovimientosVersion] = useState(0)
  const [hojaAbierta, setHojaAbierta] = useState(false)
  const [movimientoEditando, setMovimientoEditando] = useState(null)
  // Señal de una sola vez para que la tarjeta de promoción del 2FA en
  // Home.jsx pueda llevar al usuario directo a la sección Seguridad de
  // Perfil (no solo a la pantalla de Perfil en general). Perfil.jsx la
  // consume apenas monta (ver onSeguridadInicialConsumida) para que quede
  // en false de nuevo -- así una visita normal a "Cuenta" por la barra de
  // navegación, después de esta, no vuelva a abrir Seguridad sola.
  const [abrirSeguridadAlEntrarAPerfil, setAbrirSeguridadAlEntrarAPerfil] = useState(false)
  const usuarioIdAnteriorRef = useRef(null)

  useEffect(() => {
    // Sin sesión todavía no hay user_id que filtrar: esperamos a que
    // useAuth() confirme la sesión antes de pedir cualquier dato. La sesión
    // temporal de recuperación de contraseña (recuperacion === 'activo')
    // también cuenta como "sin sesión" aquí: no se muestra la app mientras
    // el usuario está en la pantalla de "Establecer nueva contraseña", así
    // que no tiene sentido pedir sus cuentas/categorías todavía. Lo mismo
    // aplica mientras falta el segundo factor (requiereVerificacionMfa) o
    // falta aceptar los documentos legales (requiereConsentimiento): no
    // tiene sentido traer datos de la cuenta a memoria antes de que el
    // usuario termine de demostrar que es él y de aceptar (aunque RLS ya
    // los protege, acá evitamos pedirlos de más).
    if (!sesion || recuperacion || requiereVerificacionMfa || requiereConsentimiento) return
    cargarCuentas()
    cargarTarjetas()
    cargarCategorias()
  }, [sesion, recuperacion, requiereVerificacionMfa, requiereConsentimiento])

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

    // Se lee de la vista "cuentas_con_saldo" (Fase 2 del plan de saldo
    // calculado, ver sql/supabase_saldo_calculado.sql) en vez de la tabla
    // "cuentas" directo: expone el mismo "saldo" de siempre más
    // "saldo_inicial" y "cantidad_movimientos", calculados en vivo a
    // partir de los movimientos -- nunca guardados, así que no pueden
    // quedar desincronizados entre pestañas/sesiones. Los servicios que
    // ESCRIBEN (movimientos.js, gastosFijos.js, cuentas.js) siguen
    // escribiendo en la tabla real "cuentas" -- la vista es de solo
    // lectura.
    const { data, error } = await seleccionarPropio('cuentas_con_saldo').order('saldo', { ascending: false })

    if (error) {
      console.error(error)
      setErrorCuentas(true)
    } else {
      setCuentas(data)
    }

    setCargandoCuentas(false)
  }

  // Recarga silenciosa de "cuentas_con_saldo", de fondo: a diferencia de
  // cargarCuentas() de arriba, NO toca cargandoCuentas/errorCuentas -- esos
  // flags controlan el gate de pantalla completa de más abajo
  // (`if (cargandoCuentas) return <PantallaCargando />`), así que llamar a
  // cargarCuentas() de nuevo cada vez que se crea/edita/borra un movimiento
  // haría parpadear TODA la app a la pantalla de carga en cada guardado.
  //
  // Se usa para refrescar "cantidad_movimientos" (Fase 5 del plan de saldo
  // calculado -- decide si HojaCuenta.jsx deja editar el saldo inicial de
  // una cuenta), que no tiene equivalente optimista como el saldo: crear o
  // borrar un movimiento cambia cuántos movimientos tiene esa cuenta, pero
  // eso no es algo que aplicarActualizacionesSaldo (pensada solo para el
  // NÚMERO del saldo) sepa ajustar. En vez de duplicar esa lógica de deltas
  // a mano (¿qué cuentas están afectadas, sumar o restar 1, casos de
  // traslado/edición-que-cambia-de-cuenta...) se reutiliza la MISMA
  // consulta de siempre -- ya devuelve cantidad_movimientos recalculado en
  // vivo, siempre correcto, sin tener que razonar de nuevo cada caso. Si la
  // consulta falla, no pasa nada grave: cantidad_movimientos se queda con
  // el valor de antes hasta el próximo intento -- mismo criterio de "se
  // corrige solo" que ya usa el saldo optimista.
  async function refrescarCuentas() {
    const { data, error } = await seleccionarPropio('cuentas_con_saldo').order('saldo', { ascending: false })
    if (!error) {
      setCuentas(data)
    }
  }

  // Recarga silenciosa de "tarjetas_con_deuda", de fondo -- mismo criterio y
  // mismo motivo que refrescarCuentas arriba, pero para "cantidad_movimientos"
  // de las tarjetas: un gasto (o su edición/borrado) puede haber cambiado
  // cuántos movimientos tiene la tarjeta afectada. Se llama junto con
  // refrescarCuentas en cada operación de movimiento, sin distinguir si ese
  // movimiento en particular tocó una cuenta o una tarjeta -- más simple que
  // decidirlo caso por caso, y sin costo real (una consulta de más).
  async function refrescarTarjetas() {
    const { data, error } = await seleccionarPropio('tarjetas_con_deuda').order('deuda', { ascending: false })
    if (!error) {
      setTarjetas(data)
    }
  }

  async function cargarTarjetas() {
    setCargandoTarjetas(true)
    setErrorTarjetas(null)

    // Se lee de la vista "tarjetas_con_deuda" (Fase 2 del plan de tarjetas
    // de crédito, ver sql/supabase_tarjetas_movimientos.sql): expone cada
    // tarjeta con "deuda", "cupo_disponible" y "cantidad_movimientos"
    // calculados en vivo a partir de sus movimientos -- mismo criterio que
    // "cuentas_con_saldo". La tabla "tarjetas" en sí (services/tarjetas.js)
    // sigue siendo la que se ESCRIBE; la vista es de solo lectura.
    const { data, error } = await seleccionarPropio('tarjetas_con_deuda').order('deuda', { ascending: false })

    if (error) {
      console.error(error)
      setErrorTarjetas(true)
    } else {
      setTarjetas(data)
    }

    setCargandoTarjetas(false)
  }

  async function cargarCategorias() {
    setCargandoCategorias(true)
    setErrorCategorias(null)

    const { data, error } = await seleccionarPropio('categorias').order('nombre')

    if (error) {
      console.error(error)
      setErrorCategorias(true)
    } else {
      setCategorias(data)
    }

    setCargandoCategorias(false)
  }

  // Ajuste OPTIMISTA de saldo: desde la Fase 3 del plan de saldo calculado,
  // los servicios de movimientos.js/gastosFijos.js ya no escriben
  // "cuentas.saldo" ni lo calculan -- el saldo real vive en la vista
  // "cuentas_con_saldo" (Fase 1/2), calculada en vivo a partir de
  // "saldo_inicial" + los movimientos. Lo que devuelven ahora es un DELTA
  // por cuenta (`{ id, delta }[]`, cuánto cambia -- no el valor final), que
  // acá se suma al saldo que ya está en pantalla solo como feedback visual
  // instantáneo, para que la UI no tenga que esperar una recarga. Nunca se
  // escribe a la base: si este hint quedara desactualizado por cualquier
  // motivo (dos pestañas abiertas, etc.), la próxima carga real de
  // "cuentas_con_saldo" lo corrige solo -- a diferencia del saldo guardado
  // de antes, acá no hay nada que pueda quedar "pisado" de forma permanente.
  function aplicarActualizacionesSaldo(actualizaciones) {
    if (!actualizaciones.length) return

    setCuentas((actuales) =>
      actuales
        .map((c) => {
          const ajuste = actualizaciones.find((a) => a.id === c.id)
          return ajuste ? { ...c, saldo: c.saldo + ajuste.delta } : c
        })
        .sort((a, b) => b.saldo - a.saldo),
    )
  }

  // Calco de aplicarActualizacionesSaldo, pero sobre `tarjetas`: el hint
  // optimista que devuelven los servicios de movimientos (Fase 4 del plan de
  // tarjetas de crédito) es un DELTA de "deuda", no el valor final -- acá se
  // suma a la deuda que ya está en pantalla y se recalcula "cupo_disponible"
  // a mano (cupo_total - deuda nueva), igual que ya hace actualizarTarjeta
  // más abajo cuando cambia el cupo. Nunca se escribe a la base: si quedara
  // desactualizado, la próxima carga real de "tarjetas_con_deuda" lo corrige
  // solo.
  function aplicarActualizacionesDeuda(actualizaciones) {
    if (!actualizaciones.length) return

    setTarjetas((actuales) =>
      tarjetasService.ordenarPorDeuda(
        actuales.map((t) => {
          const ajuste = actualizaciones.find((a) => a.id === t.id)
          if (!ajuste) return t
          const deuda = t.deuda + ajuste.delta
          return { ...t, deuda, cupo_disponible: t.cupo_total - deuda }
        }),
      ),
    )
  }

  async function agregarMovimiento(datos) {
    const { actualizaciones, actualizacionesTarjeta = [] } = await movimientosService.agregarMovimiento(
      datosUsuario,
      cuentas,
      tarjetas,
      datos,
    )
    aplicarActualizacionesSaldo(actualizaciones)
    aplicarActualizacionesDeuda(actualizacionesTarjeta)
    setMovimientosVersion((version) => version + 1)
    // Sin await a propósito: el saldo/deuda ya se actualizó al instante
    // arriba (hint optimista), así que no hay que esperar estas consultas
    // extra para cerrar la hoja del formulario -- cantidad_movimientos llega
    // un instante después, de fondo, sin bloquear nada.
    refrescarCuentas()
    refrescarTarjetas()
  }

  function abrirNuevoMovimiento() {
    setMovimientoEditando(null)
    setHojaAbierta(true)
  }

  function cerrarHojaMovimiento() {
    setHojaAbierta(false)
    setMovimientoEditando(null)
  }

  function irASeguridadDesdeHome() {
    setAbrirSeguridadAlEntrarAPerfil(true)
    setVista('mas')
  }

  async function actualizarMovimiento(movimientoOriginal, datos) {
    const { actualizaciones, actualizacionesTarjeta = [] } = await movimientosService.actualizarMovimiento(
      datosUsuario,
      cuentas,
      tarjetas,
      movimientoOriginal,
      datos,
    )
    aplicarActualizacionesSaldo(actualizaciones)
    aplicarActualizacionesDeuda(actualizacionesTarjeta)
    setMovimientosVersion((version) => version + 1)
    // Cubre también el caso de editar un movimiento cambiándolo de
    // cuenta/tarjeta: todas las involucradas (la vieja y la nueva, sea cuenta
    // o tarjeta) pueden haber cambiado su cantidad_movimientos, y estas
    // consultas las traen ya recalculadas todas de una vez, sin tener que
    // distinguir cuáles fueron las afectadas.
    refrescarCuentas()
    refrescarTarjetas()
  }

  async function eliminarMovimiento(movimiento) {
    const { actualizaciones, actualizacionesTarjeta = [] } = await movimientosService.eliminarMovimiento(
      datosUsuario,
      cuentas,
      tarjetas,
      movimiento,
    )
    aplicarActualizacionesSaldo(actualizaciones)
    aplicarActualizacionesDeuda(actualizacionesTarjeta)
    setMovimientosVersion((version) => version + 1)
    refrescarCuentas()
    refrescarTarjetas()
  }

  // Paga (total o parcialmente) la deuda de `tarjeta` desde una cuenta --
  // Fase 5 del plan de tarjetas de crédito. Mismo patrón que
  // agregarMovimiento/actualizarMovimiento/eliminarMovimiento: aplica los
  // dos hints optimistas (baja el saldo de la cuenta, baja la deuda de la
  // tarjeta) y refresca ambas listas de fondo, sin bloquear el cierre de la
  // hoja de pago.
  async function pagarTarjeta(tarjeta, datos) {
    const { actualizaciones, actualizacionesTarjeta } = await movimientosService.pagarTarjeta(
      datosUsuario,
      cuentas,
      tarjeta,
      datos,
    )
    aplicarActualizacionesSaldo(actualizaciones)
    aplicarActualizacionesDeuda(actualizacionesTarjeta)
    setMovimientosVersion((version) => version + 1)
    refrescarCuentas()
    refrescarTarjetas()
  }

  // `periodo` es { mes, anio, quincena }: el mes/año seleccionado en el
  // selector de arriba, no necesariamente el mes actual. El pago se
  // registra dentro de ESE mes (ver fechaPagoEnPeriodo dentro del
  // servicio). Devuelve el movimiento (existente o recién creado) para que
  // la pantalla pueda actualizar su estado local sin tener que recargar todo.
  async function marcarGastoFijoPagado(gasto, cuentaId, periodo) {
    const { movimiento, actualizaciones } = await gastosFijosService.marcarGastoFijoPagado(
      datosUsuario,
      cuentas,
      categorias,
      gasto,
      cuentaId,
      periodo,
    )
    aplicarActualizacionesSaldo(actualizaciones)
    setMovimientosVersion((version) => version + 1)
    // Marcar como pagado inserta un movimiento real (ver el servicio): la
    // cuenta elegida puede pasar de 0 a 1 movimiento, así que también hay
    // que refrescar cantidad_movimientos, igual que en agregarMovimiento.
    refrescarCuentas()
    return movimiento
  }

  // `periodo` es { mes, anio, quincena }: desmarca el pago de ESE mes
  // concreto (busca y borra solo el movimiento vinculado cuya fecha caiga
  // en ese mes), no cualquier movimiento del gasto fijo.
  async function desmarcarGastoFijoPagado(gasto, periodo) {
    const { actualizaciones } = await gastosFijosService.desmarcarGastoFijoPagado(
      datosUsuario,
      cuentas,
      gasto,
      periodo,
    )
    aplicarActualizacionesSaldo(actualizaciones)
    setMovimientosVersion((version) => version + 1)
    // Desmarcar borra el movimiento vinculado -- mismo motivo que arriba.
    refrescarCuentas()
  }

  async function agregarGastoFijo(datos) {
    return gastosFijosService.agregarGastoFijo(datosUsuario, datos)
  }

  async function actualizarGastoFijo(gasto, datos) {
    const { data, sincronizoDescripcion } = await gastosFijosService.actualizarGastoFijo(
      datosUsuario,
      gasto,
      datos,
    )
    if (sincronizoDescripcion) {
      setMovimientosVersion((version) => version + 1)
    }
    return data
  }

  // Si el gasto ya está pagado, el servicio primero revierte el pago
  // reutilizando su propia lógica de "desmarcar" (devuelve el saldo a la
  // cuenta y borra el movimiento vinculado) antes de borrar el gasto fijo.
  async function eliminarGastoFijo(gasto) {
    const { actualizaciones } = await gastosFijosService.eliminarGastoFijo(datosUsuario, cuentas, gasto)
    aplicarActualizacionesSaldo(actualizaciones)
    if (gasto.pagado) {
      setMovimientosVersion((version) => version + 1)
      // Solo si estaba pagado había un movimiento vinculado que borrar --
      // mismo motivo que en desmarcarGastoFijoPagado.
      refrescarCuentas()
    }
  }

  async function agregarCuenta(datos) {
    const data = await cuentasService.agregarCuenta(datosUsuario, datos)
    // El INSERT devuelve la fila cruda de la tabla "cuentas" (sin
    // "cantidad_movimientos", que solo existe en la vista "cuentas_con_saldo"
    // -- ver cargarCuentas arriba). Una cuenta recién creada nunca tiene
    // movimientos todavía, así que es seguro completarlo en 0 a mano en vez
    // de esperar el próximo refetch de la vista.
    setCuentas((actuales) =>
      cuentasService.ordenarPorSaldo([...actuales, { ...data, cantidad_movimientos: 0 }]),
    )
  }

  async function actualizarCuenta(id, datos) {
    const data = await cuentasService.actualizarCuenta(datosUsuario, id, datos)
    // Igual que arriba, el UPDATE devuelve la fila cruda de "cuentas", sin
    // "cantidad_movimientos" -- se MEZCLA sobre la cuenta que ya había en
    // pantalla (no se reemplaza entera) para conservar ese dato. Si se
    // reemplazara tal cual por `data`, la próxima vez que se abriera esta
    // MISMA cuenta para editar, HojaCuenta.jsx vería cantidad_movimientos
    // en undefined y dejaría el saldo inicial editable de nuevo aunque la
    // cuenta sí tenga movimientos (ver el blindaje de esto mismo en
    // services/cuentas.js/actualizarCuenta).
    setCuentas((actuales) =>
      cuentasService.ordenarPorSaldo(actuales.map((c) => (c.id === id ? { ...c, ...data } : c))),
    )
  }

  async function eliminarCuenta(cuenta) {
    await cuentasService.eliminarCuenta(datosUsuario, cuenta)
    setCuentas((actuales) => actuales.filter((c) => c.id !== cuenta.id))
    // Fase 6 del plan de tarjetas de crédito: borrar una cuenta ahora borra
    // en cascada sus movimientos (ver sql/supabase_fix_borrado_cuentas.sql
    // -- "on delete cascade" en cuenta_id/cuenta_destino_id, en vez de "on
    // delete set null"). Eso puede incluir traslados (afecta el saldo de la
    // OTRA cuenta del traslado, que sigue existiendo) y pagos de tarjeta
    // (la deuda de esa tarjeta vuelve a subir, porque ese pago ya no
    // existe). No hay un delta optimista simple que calcular acá -- no se
    // sabe, sin consultar, cuántos traslados/pagos tenía esta cuenta ni con
    // quién -- así que se refresca completo, mismo criterio que ya usan las
    // operaciones de movimientos (agregarMovimiento, etc.).
    refrescarCuentas()
    refrescarTarjetas()
  }

  async function agregarTarjeta(datos) {
    const data = await tarjetasService.agregarTarjeta(datosUsuario, datos)
    // El INSERT devuelve la fila cruda de la tabla "tarjetas" (sin "deuda",
    // "cupo_disponible" ni "cantidad_movimientos", que solo existen en la
    // vista "tarjetas_con_deuda" -- ver cargarTarjetas arriba). Una tarjeta
    // recién creada nunca tiene movimientos todavía, así que es seguro
    // completarlos a mano (deuda 0, cupo_disponible = cupo_total) en vez de
    // esperar el próximo refetch de la vista.
    setTarjetas((actuales) =>
      tarjetasService.ordenarPorDeuda([
        ...actuales,
        { ...data, deuda: 0, cupo_disponible: data.cupo_total, cantidad_movimientos: 0 },
      ]),
    )
  }

  async function actualizarTarjeta(id, datos) {
    const data = await tarjetasService.actualizarTarjeta(datosUsuario, id, datos)
    // Igual que actualizarCuenta: el UPDATE devuelve la fila cruda de
    // "tarjetas", sin "deuda"/"cantidad_movimientos" -- se MEZCLA sobre la
    // tarjeta que ya había en pantalla para conservarlos. "cupo_disponible"
    // SÍ se recalcula a mano acá (cupo_total pudo cambiar, deuda no cambió
    // en este flujo -- solo pagarTarjeta/gastar con tarjeta, Fases 4-5,
    // tocan la deuda).
    setTarjetas((actuales) =>
      tarjetasService.ordenarPorDeuda(
        actuales.map((t) => (t.id === id ? { ...t, ...data, cupo_disponible: data.cupo_total - t.deuda } : t)),
      ),
    )
  }

  async function eliminarTarjeta(tarjeta) {
    await tarjetasService.eliminarTarjeta(datosUsuario, tarjeta)
    setTarjetas((actuales) => actuales.filter((t) => t.id !== tarjeta.id))
  }

  // Actualización optimista: el estado de React cambia de inmediato y el
  // servicio solo confirma en Supabase; si falla, se revierte al valor
  // original de `cuenta` (capturado antes del cambio optimista).
  async function alternarEsAhorro(cuenta) {
    const nuevoValor = !cuenta.es_ahorro

    setCuentas((actuales) =>
      actuales.map((c) => (c.id === cuenta.id ? { ...c, es_ahorro: nuevoValor } : c)),
    )

    try {
      await cuentasService.alternarEsAhorro(datosUsuario, cuenta, nuevoValor)
    } catch (error) {
      setCuentas((actuales) =>
        actuales.map((c) => (c.id === cuenta.id ? { ...c, es_ahorro: cuenta.es_ahorro } : c)),
      )
      throw error
    }
  }

  async function agregarCategoria(datos) {
    const data = await categoriasService.agregarCategoria(datosUsuario, datos)
    setCategorias((actuales) => [...actuales, data])
  }

  async function actualizarCategoria(id, datos) {
    const categoriaActual = categorias.find((categoria) => categoria.id === id)
    const data = await categoriasService.actualizarCategoria(datosUsuario, id, datos, categoriaActual)
    setCategorias((actuales) => actuales.map((categoria) => (categoria.id === id ? data : categoria)))
    setMovimientosVersion((version) => version + 1)
  }

  async function contarMovimientosDeCategoria(categoriaId) {
    return categoriasService.contarMovimientosDeCategoria(datosUsuario, categoriaId)
  }

  async function eliminarCategoria(categoria) {
    await categoriasService.eliminarCategoria(datosUsuario, categoria)
    setCategorias((actuales) => actuales.filter((c) => c.id !== categoria.id))
    setMovimientosVersion((version) => version + 1)
  }

  async function reasignarYEliminarCategoria(categoria, categoriaDestinoId) {
    await categoriasService.reasignarYEliminarCategoria(datosUsuario, categoria, categoriaDestinoId)
    setCategorias((actuales) => actuales.filter((c) => c.id !== categoria.id))
    setMovimientosVersion((version) => version + 1)
  }

  // Fase 6 del plan de saldo calculado ("Reiniciar datos", ver
  // sql/supabase_reiniciar_datos.sql): borra movimientos (y, si se elige,
  // las definiciones de gastos fijos) del usuario vía la función RPC. Como
  // el saldo es calculado, no hace falta ningún ajuste optimista de saldo
  // acá -- basta con volver a cargar "cuentas_con_saldo" (refrescarCuentas,
  // la misma recarga silenciosa que ya usa cantidad_movimientos) para que
  // cada cuenta muestre su saldo_inicial de vuelta, y bump-ear
  // movimientosVersion para que Home/Resumen/etc. recarguen sus listas de
  // movimientos (ahora vacías, o sin los gastos fijos que se hayan borrado).
  async function reiniciarDatos(opciones) {
    await reinicioService.reiniciarDatos(datosUsuario, opciones)
    await refrescarCuentas()
    setMovimientosVersion((version) => version + 1)
  }

  if (cargando) {
    return <PantallaCargando />
  }

  // Se revisa antes que `sesion`: el enlace de recuperación de contraseña
  // deja a Supabase con una sesión temporal activa (o, si el enlace ya
  // venció, sin sesión pero con el error marcado en la URL -- ver
  // AuthContext.jsx), así que en cualquiera de los dos casos hay que
  // mostrar esta pantalla en vez de la app o del login normal.
  if (recuperacion) {
    return <EstablecerNuevaContrasena />
  }

  // Entre "hay sesión" y "se puede mostrar la app" falta este paso: si el
  // usuario tiene 2FA activo, signInWithPassword lo deja en AAL1 (Supabase
  // no pide el código en el signIn en sí) -- requiereVerificacionMfa detecta
  // justo ese caso y muestra la pantalla de código en vez de la app. Un
  // usuario sin 2FA nunca pasa por acá (requiereVerificacionMfa es siempre
  // false), así que su login no cambia en nada.
  if (sesion && requiereVerificacionMfa) {
    return <VerificarMfa />
  }

  if (!sesion) {
    return <PantallaAuth />
  }

  // Después de que la identidad quedó confirmada (pasó el gate de MFA de
  // arriba, si aplica): si al usuario le falta aceptar la versión vigente de
  // la Política de Datos, los Términos, o declarar mayoría de edad -- ver
  // tieneConsentimientoVigente en utils/consentimientos.js -- se le pide
  // aceptar antes de dejarlo entrar. Va DESPUÉS del gate de MFA a propósito:
  // primero se confirma que es realmente el dueño de la cuenta (segundo
  // factor), y solo entonces se le pide aceptar los documentos a su nombre.
  // Cubre tanto cuentas viejas (de antes de que existieran los checkboxes de
  // Registro.jsx) como una futura subida de versión de cualquier documento.
  if (requiereConsentimiento) {
    return <PantallaConsentimiento />
  }

  // La premisa de Seed es que el dinero vive en CUENTAS: un usuario recién
  // registrado (o que borró su última cuenta desde GestionCuentas) no puede
  // hacer nada útil todavía -- ni HojaNuevoMovimiento tiene de dónde sacar
  // una cuenta para el movimiento. Antes de dejarlo entrar a la app se le
  // pide crear su primera cuenta acá. Va DESPUÉS de MFA y consentimiento a
  // propósito: primero se confirma identidad y aceptación legal, y solo
  // entonces tiene sentido pedirle datos financieros.
  //
  // Se espera a que cargandoCuentas termine (mismo criterio anti-parpadeo
  // que usa mostrarBienvenida más abajo para moneda/idioma/guía) para no
  // mostrar el onboarding un instante mientras las cuentas reales todavía
  // están cargando. Si la carga falló (errorCuentas), se deja pasar a la
  // app normal en vez de bloquear: no hay certeza de que el usuario esté
  // realmente sin cuentas, y Home/GestionCuentas ya muestran ese error por
  // su cuenta.
  if (cargandoCuentas) {
    return <PantallaCargando />
  }

  if (!errorCuentas && cuentas.length === 0) {
    return <OnboardingCuenta onAgregarCuenta={agregarCuenta} />
  }

  // Espera a que moneda/idioma/guia_vista ya hayan cargado (los 3 se leen
  // de "perfiles" al iniciar sesión, cada uno en su propio contexto) antes
  // de decidir si mostrar la bienvenida. Sin esto, guiaVista empezaría en
  // su valor por defecto (true) y GuiaBienvenida podría alcanzar a
  // mostrarse un instante en español para un usuario en inglés, antes de
  // que IdiomaContext termine de leer su idioma real -- el mismo problema
  // de parpadeo que ya evita, por ejemplo, useConsulta.
  const mostrarBienvenida = !cargandoMoneda && !cargandoIdioma && !cargandoGuia && !guiaVista

  return (
    <>
      {mostrarBienvenida && <GuiaBienvenida />}

      {vista === 'inicio' && (
        <Home
          cuentas={cuentas}
          cargandoCuentas={cargandoCuentas}
          errorCuentas={errorCuentas}
          tarjetas={tarjetas}
          cargandoTarjetas={cargandoTarjetas}
          errorTarjetas={errorTarjetas}
          categorias={categorias.filter((categoria) => !categoria.es_sistema)}
          movimientosVersion={movimientosVersion}
          onGestionarCuentas={() => setVista('cuentas')}
          onGestionarTarjetas={() => setVista('tarjetas')}
          onGestionarCategorias={() => setVista('categorias')}
          onGestionarGastosFijos={() => setVista('gastosFijos')}
          onMarcarGastoFijoPagado={marcarGastoFijoPagado}
          onDesmarcarGastoFijoPagado={desmarcarGastoFijoPagado}
          onEliminarMovimiento={eliminarMovimiento}
          onAgregarMovimiento={agregarMovimiento}
          onActualizarMovimiento={actualizarMovimiento}
          onPagarTarjeta={pagarTarjeta}
          onIrASeguridad={irASeguridadDesdeHome}
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
      {vista === 'tarjetas' && (
        <GestionTarjetas
          tarjetas={tarjetas}
          cargandoTarjetas={cargandoTarjetas}
          errorTarjetas={errorTarjetas}
          onVolver={() => setVista('inicio')}
          onAgregarTarjeta={agregarTarjeta}
          onActualizarTarjeta={actualizarTarjeta}
          onEliminarTarjeta={eliminarTarjeta}
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
      {vista === 'viajes' && <Viajes />}
      {vista === 'mas' && (
        <Perfil
          abrirSeguridadInicial={abrirSeguridadAlEntrarAPerfil}
          onSeguridadInicialConsumida={() => setAbrirSeguridadAlEntrarAPerfil(false)}
          onReiniciarDatos={reiniciarDatos}
        />
      )}

      {vista === 'inicio' && <BotonAgregar onClick={abrirNuevoMovimiento} />}

      <HojaNuevoMovimiento
        abierta={hojaAbierta}
        onCerrar={cerrarHojaMovimiento}
        cuentas={cuentas}
        tarjetas={tarjetas}
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
