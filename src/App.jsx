import { useEffect, useRef, useState } from 'react'
import Home from './views/Home'
import Emergencia from './views/Emergencia'
import GestionCuentas from './views/GestionCuentas'
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
import * as movimientosService from './services/movimientos'
import * as gastosFijosService from './services/gastosFijos'

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

  async function agregarMovimiento(datos) {
    const { actualizaciones } = await movimientosService.agregarMovimiento(datosUsuario, cuentas, datos)
    aplicarActualizacionesSaldo(actualizaciones)
    setMovimientosVersion((version) => version + 1)
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
    const { actualizaciones } = await movimientosService.actualizarMovimiento(
      datosUsuario,
      cuentas,
      movimientoOriginal,
      datos,
    )
    aplicarActualizacionesSaldo(actualizaciones)
    setMovimientosVersion((version) => version + 1)
  }

  async function eliminarMovimiento(movimiento) {
    const { actualizaciones } = await movimientosService.eliminarMovimiento(datosUsuario, cuentas, movimiento)
    aplicarActualizacionesSaldo(actualizaciones)
    setMovimientosVersion((version) => version + 1)
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
    }
  }

  async function agregarCuenta(datos) {
    const data = await cuentasService.agregarCuenta(datosUsuario, datos)
    setCuentas((actuales) => cuentasService.ordenarPorSaldo([...actuales, data]))
  }

  async function actualizarCuenta(id, datos) {
    const data = await cuentasService.actualizarCuenta(datosUsuario, id, datos)
    setCuentas((actuales) => cuentasService.ordenarPorSaldo(actuales.map((c) => (c.id === id ? data : c))))
  }

  async function eliminarCuenta(cuenta) {
    await cuentasService.eliminarCuenta(datosUsuario, cuenta)
    setCuentas((actuales) => actuales.filter((c) => c.id !== cuenta.id))
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
          categorias={categorias.filter((categoria) => !categoria.es_sistema)}
          movimientosVersion={movimientosVersion}
          onGestionarCuentas={() => setVista('cuentas')}
          onGestionarCategorias={() => setVista('categorias')}
          onGestionarGastosFijos={() => setVista('gastosFijos')}
          onMarcarGastoFijoPagado={marcarGastoFijoPagado}
          onDesmarcarGastoFijoPagado={desmarcarGastoFijoPagado}
          onEliminarMovimiento={eliminarMovimiento}
          onAgregarMovimiento={agregarMovimiento}
          onActualizarMovimiento={actualizarMovimiento}
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
        />
      )}

      {vista === 'inicio' && <BotonAgregar onClick={abrirNuevoMovimiento} />}

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
