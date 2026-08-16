import { useState } from 'react'
import { Plane } from 'lucide-react'
import AvatarUsuario from '../components/AvatarUsuario'
import TarjetaViaje from '../components/TarjetaViaje'
import HojaNuevoViaje from '../components/HojaNuevoViaje'
import DetalleViaje from './DetalleViaje'
import ResumenViaje from './ResumenViaje'
import { useIdioma } from '../context/IdiomaContext'
import { useDatosUsuario } from '../lib/datosUsuario'
import { useConsulta } from '../hooks/useConsulta'
import * as viajesService from '../services/viajes'
import * as categoriasViajeService from '../services/categoriasViaje'
import MensajeError from '../components/ui/MensajeError'
import BotonPrimario from '../components/ui/BotonPrimario'

// Pantalla autosuficiente (como Emergencia.jsx): carga sus propios datos con
// useDatosUsuario + useConsulta, sin depender de props de App.jsx. "Viajes"
// es un "mundo aparte" de planificación, no toca cuentas ni movimientos
// reales.
//
// Fase 2: suma navegación interna con un estado "modo" ('lista' | 'detalle')
// -- al tocar una tarjeta de viaje se abre DetalleViaje.jsx con sus
// categorías. Las fases siguientes (gastos, dashboard, resumen) reutilizan
// este mismo esquema.
//
// Fase 5: agrega el modo 'resumen' -- desde el botón "Ver resumen" del
// detalle se abre ResumenViaje.jsx para el mismo viaje. Al volver desde el
// resumen se regresa al detalle (no a la lista), por eso "volverAlDetalle"
// solo cambia el modo y conserva viajeSeleccionado.
function Viajes() {
  const datosUsuario = useDatosUsuario()
  const { seleccionarPropio } = datosUsuario
  const { t } = useIdioma()

  const [modo, setModo] = useState('lista')
  const [viajeSeleccionado, setViajeSeleccionado] = useState(null)
  const [hojaAbierta, setHojaAbierta] = useState(false)
  const [viajeEditando, setViajeEditando] = useState(null)
  const [eliminandoId, setEliminandoId] = useState(null)
  const [errorEliminar, setErrorEliminar] = useState(null)
  const [errorCategoriasDefecto, setErrorCategoriasDefecto] = useState(null)

  async function cargarViajes() {
    const { data, error } = await seleccionarPropio('viajes', '*').order('creado_en', { ascending: false })
    if (error) throw new Error(error.message)
    return data
  }

  const {
    datos: viajes,
    cargando,
    error,
    establecerDatos: setViajes,
  } = useConsulta(cargarViajes, [], [])

  function abrirCrearViaje() {
    setViajeEditando(null)
    setHojaAbierta(true)
  }

  function abrirEditarViaje(viaje) {
    setViajeEditando(viaje)
    setHojaAbierta(true)
  }

  function cerrarHojaViaje() {
    setHojaAbierta(false)
    setViajeEditando(null)
  }

  function abrirDetalleViaje(viaje) {
    setViajeSeleccionado(viaje)
    setModo('detalle')
  }

  function volverALista() {
    setModo('lista')
    setViajeSeleccionado(null)
  }

  function abrirResumenViaje() {
    setModo('resumen')
  }

  function volverAlDetalle() {
    setModo('detalle')
  }

  async function agregarViaje(datos) {
    const data = await viajesService.agregarViaje(datosUsuario, datos)
    setViajes((actuales) => viajesService.ordenarPorCreacion([data, ...actuales]))

    // Si falla la creación de las categorías por defecto, el viaje igual
    // queda creado -- se avisa con un mensaje aparte en vez de propagar el
    // error (que haría creer que el viaje no se guardó).
    setErrorCategoriasDefecto(null)
    try {
      await categoriasViajeService.crearCategoriasPorDefecto(datosUsuario, data.id, t)
    } catch (err) {
      setErrorCategoriasDefecto(t('viajes.detalle.errorCategoriasDefecto') + err.message)
    }
  }

  async function actualizarViaje(id, datos) {
    const data = await viajesService.actualizarViaje(datosUsuario, id, datos)
    setViajes((actuales) => actuales.map((viaje) => (viaje.id === id ? data : viaje)))
  }

  async function eliminarViaje(viaje) {
    const confirmado = window.confirm(t('viajes.confirmarEliminar', { nombre: viaje.nombre }))
    if (!confirmado) return

    setErrorEliminar(null)
    setEliminandoId(viaje.id)

    try {
      await viajesService.eliminarViaje(datosUsuario, viaje)
      setViajes((actuales) => actuales.filter((v) => v.id !== viaje.id))
    } catch (err) {
      setErrorEliminar(t('viajes.errorEliminar') + err.message)
    } finally {
      setEliminandoId(null)
    }
  }

  if (modo === 'resumen' && viajeSeleccionado) {
    return <ResumenViaje viaje={viajeSeleccionado} onVolver={volverAlDetalle} />
  }

  if (modo === 'detalle' && viajeSeleccionado) {
    return <DetalleViaje viaje={viajeSeleccionado} onVolver={volverALista} onVerResumen={abrirResumenViaje} />
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pb-28">
        <section className="superficie-hero flex items-center gap-3 rounded-2xl p-5 shadow-elevated">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mint/15 text-mint">
            <Plane className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-text">{t('viajes.titulo')}</h1>
            <p className="text-xs text-text-dim">{t('viajes.subtitulo')}</p>
          </div>
          <AvatarUsuario />
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text">{t('viajes.misViajes')}</h2>
            {viajes.length > 0 && (
              <button
                type="button"
                onClick={abrirCrearViaje}
                className="rounded-full bg-panel-2 px-3 py-1.5 text-xs font-semibold text-mint"
              >
                {t('viajes.nuevoViaje')}
              </button>
            )}
          </div>

          {cargando && <p className="px-2 text-sm text-text-dim">{t('viajes.cargando')}</p>}

          {error && (
            <MensajeError>
              {t('viajes.errorCargar')}
              {error}
            </MensajeError>
          )}

          <MensajeError>{errorEliminar}</MensajeError>
          <MensajeError>{errorCategoriasDefecto}</MensajeError>

          {!cargando && !error && viajes.length === 0 && (
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-panel p-8 text-center shadow-card">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-mint/10 text-mint">
                <Plane className="h-8 w-8" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-text">{t('viajes.vacio.titulo')}</p>
                <p className="mt-1 text-xs text-text-dim">{t('viajes.vacio.descripcion')}</p>
              </div>
              <BotonPrimario onClick={abrirCrearViaje}>{t('viajes.vacio.boton')}</BotonPrimario>
            </div>
          )}

          {!cargando &&
            !error &&
            viajes.map((viaje) => (
              <TarjetaViaje
                key={viaje.id}
                viaje={viaje}
                eliminando={eliminandoId === viaje.id}
                onAbrir={() => abrirDetalleViaje(viaje)}
                onEditar={() => abrirEditarViaje(viaje)}
                onEliminar={() => eliminarViaje(viaje)}
              />
            ))}
        </section>
      </div>

      <HojaNuevoViaje
        abierta={hojaAbierta}
        viajeEditando={viajeEditando}
        onCerrar={cerrarHojaViaje}
        onGuardar={agregarViaje}
        onActualizar={(datos) => actualizarViaje(viajeEditando.id, datos)}
      />
    </main>
  )
}

export default Viajes
