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

function App() {
  const { sesion, cargando } = useAuth()
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

  // Aplica al estado de React los saldos finales que devuelve el servicio
  // de movimientos ({ id, saldo }[]), manteniendo el mismo orden por saldo
  // que usaban los handlers antes de esta migración.
  function aplicarActualizacionesSaldo(actualizaciones) {
    if (!actualizaciones.length) return

    setCuentas((actuales) =>
      actuales
        .map((c) => {
          const actualizacion = actualizaciones.find((a) => a.id === c.id)
          return actualizacion ? { ...c, saldo: actualizacion.saldo } : c
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
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-sm text-text-dim">Cargando...</p>
      </main>
    )
  }

  if (!sesion) {
    return <PantallaAuth />
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
      {vista === 'viajes' && <Viajes />}
      {vista === 'mas' && <Perfil />}

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
