import { useState } from 'react'
import Movimiento, { descripcionEnContexto } from '../components/Movimiento'
import SelectorPeriodo from '../components/SelectorPeriodo'
import HojaNuevoMovimiento from '../components/HojaNuevoMovimiento'
import FilaTotales from '../components/FilaTotales'
import { useIdioma } from '../context/IdiomaContext'
import { useFormatoMoneda } from '../context/MonedaContext'
import { useMovimientosPeriodo } from '../hooks/useMovimientosPeriodo'
import BotonVolver from '../components/ui/BotonVolver'
import MensajeError from '../components/ui/MensajeError'

const hoy = new Date()

// ¿Este movimiento representa dinero que ENTRA a `cuentaId`? Un ingreso
// siempre entra; un gasto siempre sale; un traslado depende de qué lado de
// la cuenta se está mirando -- entra si esta cuenta es el destino, sale si
// es el origen (ver decisión de diseño: los traslados cuentan como
// ingreso/egreso "normal" desde la perspectiva de cada cuenta).
function esEntradaEnCuenta(movimiento, cuentaId) {
  if (movimiento.tipo === 'ingreso') return true
  if (movimiento.tipo === 'gasto') return false
  return movimiento.cuenta_destino_id === cuentaId
}

// Pantalla de detalle de una cuenta puntual (Fase 1 de "cuentas y
// categorías navegables"): se abre al tocar una cuenta en Home.jsx, igual
// que DetalleViaje.jsx se abre al tocar un viaje en Viajes.jsx. Home.jsx
// controla esta navegación con su propio "modo" local, sin tocar el
// `vista` de App.jsx -- así el botón "+" y la barra inferior siguen
// mostrándose igual que siempre.
//
// El estado de cuentas/categorías y las funciones que ajustan saldos
// (agregar/actualizar/eliminar movimiento) siguen viviendo en App.jsx;
// esta pantalla las recibe como props, igual que Home hoy.
//
// Versión resumida: en vez de listar TODOS los movimientos del mes, muestra
// 3 totales (ingresos/egresos/neto, con traslados contando según el lado
// de la cuenta) y solo el DETALLE de los ingresos -- el detalle de los
// egresos se verá desde las categorías en una fase posterior.
function DetalleCuenta({
  cuenta,
  cuentas,
  categorias,
  movimientosVersion,
  onVolver,
  onAgregarMovimiento,
  onActualizarMovimiento,
  onEliminarMovimiento,
}) {
  const { t } = useIdioma()
  const formatear = useFormatoMoneda()

  const [periodo, setPeriodo] = useState({ mes: hoy.getMonth(), anio: hoy.getFullYear() })
  const [hojaAbierta, setHojaAbierta] = useState(false)
  const [movimientoEditando, setMovimientoEditando] = useState(null)
  const [eliminandoId, setEliminandoId] = useState(null)
  const [errorEliminar, setErrorEliminar] = useState(null)

  const {
    datos: movimientos,
    cargando: cargandoMovimientos,
    error: errorMovimientos,
    establecerDatos: setMovimientos,
  } = useMovimientosPeriodo({ periodo, version: movimientosVersion, cuentaId: cuenta.id })

  // Un solo recorrido de los movimientos del mes: acumula los 3 totales (que
  // consideran TODOS los movimientos, incluidos los traslados en ambas
  // direcciones) y a la vez arma la lista de abajo, que excluye únicamente
  // los gastos normales (con categoría) -- ingresos y traslados (de entrada
  // Y de salida) sí se listan, con su texto/color direccional ya resuelto
  // por <Movimiento cuentaContextoId=... />.
  const { totalIngresos, totalEgresos, listaMovimientos } = movimientos.reduce(
    (acumulado, movimiento) => {
      if (esEntradaEnCuenta(movimiento, cuenta.id)) {
        acumulado.totalIngresos += movimiento.monto
      } else {
        acumulado.totalEgresos += movimiento.monto
      }
      if (movimiento.tipo !== 'gasto') {
        acumulado.listaMovimientos.push(movimiento)
      }
      return acumulado
    },
    { totalIngresos: 0, totalEgresos: 0, listaMovimientos: [] },
  )
  const neto = totalIngresos - totalEgresos

  function irMesAnterior() {
    setPeriodo((actual) => {
      const esEnero = actual.mes === 0
      return { mes: esEnero ? 11 : actual.mes - 1, anio: esEnero ? actual.anio - 1 : actual.anio }
    })
  }

  function irMesSiguiente() {
    setPeriodo((actual) => {
      const esDiciembre = actual.mes === 11
      return { mes: esDiciembre ? 0 : actual.mes + 1, anio: esDiciembre ? actual.anio + 1 : actual.anio }
    })
  }

  function abrirNuevoMovimiento() {
    setMovimientoEditando(null)
    setHojaAbierta(true)
  }

  function abrirEditarMovimiento(movimiento) {
    if (movimiento.gasto_fijo_id) return
    setMovimientoEditando(movimiento)
    setHojaAbierta(true)
  }

  function cerrarHoja() {
    setHojaAbierta(false)
    setMovimientoEditando(null)
  }

  async function manejarEliminar(movimiento) {
    if (movimiento.gasto_fijo_id) return

    const descripcion = descripcionEnContexto(movimiento, cuenta.id, t)
    const confirmado = window.confirm(
      movimiento.tipo === 'traslado'
        ? t('home.confirmarEliminarTraslado', { descripcion })
        : t('home.confirmarEliminarMovimiento', { descripcion }),
    )
    if (!confirmado) return

    setErrorEliminar(null)
    setEliminandoId(movimiento.id)

    try {
      await onEliminarMovimiento(movimiento)
      setMovimientos((actuales) => actuales.filter((m) => m.id !== movimiento.id))
    } catch (error) {
      console.error(error)
      setErrorEliminar(true)
    } finally {
      setEliminandoId(null)
    }
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pb-28">
        <header className="flex items-center gap-3">
          <BotonVolver onClick={onVolver} etiqueta={t('nav.inicio')} ariaLabel={t('cuentas.detalle.volverAria')} />
        </header>

        <section className="superficie-hero flex flex-col gap-4 rounded-2xl p-5 shadow-elevated">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold text-bg"
              style={{ backgroundColor: cuenta.color }}
            >
              {cuenta.inicial || cuenta.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-text">{cuenta.nombre}</h1>
              {cuenta.tipo && <p className="truncate text-xs text-text-dim">{cuenta.tipo}</p>}
            </div>
            <p className="shrink-0 text-base font-bold text-text">{formatear(cuenta.saldo)}</p>
          </div>

          <div className="border-t border-line pt-4">
            <FilaTotales
              items={[
                {
                  etiqueta: t('cuentas.detalle.ingresosTitulo'),
                  montoTexto: formatear(totalIngresos),
                  colorPunto: 'var(--color-mint)',
                  colorTexto: 'text-mint',
                },
                {
                  etiqueta: t('cuentas.detalle.egresosTitulo'),
                  montoTexto: formatear(totalEgresos),
                  colorPunto: 'var(--color-coral)',
                  colorTexto: 'text-coral',
                },
                {
                  etiqueta: t('cuentas.detalle.netoTitulo'),
                  montoTexto: formatear(neto),
                  colorPunto: neto >= 0 ? 'var(--color-mint)' : 'var(--color-coral)',
                  colorTexto: neto >= 0 ? 'text-mint' : 'text-coral',
                },
              ]}
            />
          </div>
        </section>

        <SelectorPeriodo
          periodo={periodo}
          onMesAnterior={irMesAnterior}
          onMesSiguiente={irMesSiguiente}
          mostrarQuincena={false}
        />

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
              {t('cuentas.detalle.listaTitulo')}
            </h2>
            <button
              type="button"
              onClick={abrirNuevoMovimiento}
              className="text-xs font-semibold text-mint"
            >
              {t('cuentas.detalle.nuevoMovimiento')}
            </button>
          </div>

          {cargandoMovimientos && (
            <p className="px-2 text-sm text-text-dim">{t('home.cargandoMovimientos')}</p>
          )}

          {errorMovimientos && <MensajeError>{t('home.errorCargarMovimientos')}</MensajeError>}

          {errorEliminar && <MensajeError>{t('home.errorEliminarMovimiento')}</MensajeError>}

          {!cargandoMovimientos && !errorMovimientos && listaMovimientos.length === 0 && (
            <p className="rounded-2xl bg-panel p-4 text-sm text-text-dim">
              {t('cuentas.detalle.sinMovimientosLista')}
            </p>
          )}

          {!cargandoMovimientos && !errorMovimientos && listaMovimientos.length > 0 && (
            <div className="flex flex-col gap-2 rounded-2xl bg-panel shadow-card p-2">
              {listaMovimientos.map((movimiento) => (
                <Movimiento
                  key={movimiento.id}
                  movimiento={movimiento}
                  cuentaContextoId={cuenta.id}
                  eliminando={eliminandoId === movimiento.id}
                  onEditar={() => abrirEditarMovimiento(movimiento)}
                  onEliminar={() => manejarEliminar(movimiento)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <HojaNuevoMovimiento
        abierta={hojaAbierta}
        onCerrar={cerrarHoja}
        cuentas={cuentas}
        categorias={categorias}
        cuentaPreseleccionadaId={cuenta.id}
        onGuardar={onAgregarMovimiento}
        onActualizar={(datos) => onActualizarMovimiento(movimientoEditando, datos)}
        movimientoEditando={movimientoEditando}
      />
    </main>
  )
}

export default DetalleCuenta
