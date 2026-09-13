import { useState } from 'react'
import Movimiento from '../components/Movimiento'
import SelectorPeriodo from '../components/SelectorPeriodo'
import HojaEditarMovimiento from '../components/HojaEditarMovimiento'
import AsistenteMovimiento from '../components/asistente-movimiento/AsistenteMovimiento'
import FilaTotales from '../components/FilaTotales'
import { useIdioma } from '../context/IdiomaContext'
import { useFormatoMoneda } from '../context/MonedaContext'
import { useMovimientosPeriodo } from '../hooks/useMovimientosPeriodo'
import BotonVolver from '../components/ui/BotonVolver'
import MensajeError from '../components/ui/MensajeError'
import { calcularResumenCuenta, separarMovimientosCuenta, descripcionEnContexto } from '../utils/movimientosCuenta'

const hoy = new Date()

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
// Arriba, 3 totales del mes (ingresos/egresos/neto, con traslados contando
// según el lado de la cuenta). Abajo, un toggle Ingresos/Egresos para
// auditar la lista: "Ingresos" muestra lo que ENTRA (ingresos + traslados de
// entrada), "Egresos" muestra TODO lo que SALE (gastos, retiros, pagos de
// tarjeta y traslados de salida). La separación la hace
// separarMovimientosCuenta con la misma regla que los totales.
function DetalleCuenta({
  cuenta,
  cuentas,
  tarjetas,
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
  // Toggle de la lista de abajo. Arranca en 'ingresos' (lo que la lista
  // mostraba antes del cambio). No se resetea al cambiar de mes: si el
  // usuario está auditando egresos, los sigue viendo mes a mes.
  const [vistaLista, setVistaLista] = useState('ingresos')

  const {
    datos: movimientos,
    cargando: cargandoMovimientos,
    error: errorMovimientos,
    establecerDatos: setMovimientos,
  } = useMovimientosPeriodo({ periodo, version: movimientosVersion, cuentaId: cuenta.id })

  const { totalIngresos, totalEgresos, neto } = calcularResumenCuenta(movimientos, cuenta.id)
  const { entran, salen } = separarMovimientosCuenta(movimientos, cuenta.id)
  const listaVisible = vistaLista === 'ingresos' ? entran : salen

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
    // Un pago a tarjeta (Fase 5 del plan de tarjetas de crédito) puede
    // aparecer en esta lista -- es un egreso de esta cuenta, ver
    // esEntradaEnCuenta -- pero no se puede editar (ver
    // services/movimientos.js); Movimiento.jsx ya oculta el lápiz, esto es
    // la misma defensa doble que ya usa gasto_fijo_id.
    if (movimiento.gasto_fijo_id || movimiento.tipo === 'pago_tarjeta') return
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

          {/* Toggle Ingresos/Egresos: mismo segmentado en píldora que usa
              HojaNuevoMovimiento para tipo/origen. Verde para "entra",
              coral para "sale" -- mismos colores que los 3 totales de arriba. */}
          <div className="grid grid-cols-2 gap-1 rounded-full bg-panel-2 p-1">
            <button
              type="button"
              onClick={() => setVistaLista('ingresos')}
              aria-pressed={vistaLista === 'ingresos'}
              className={`rounded-full py-2 text-xs font-medium transition-colors sm:text-sm ${
                vistaLista === 'ingresos' ? 'bg-mint text-bg' : 'text-text-dim'
              }`}
            >
              {t('cuentas.detalle.ingresosTitulo')}
            </button>
            <button
              type="button"
              onClick={() => setVistaLista('egresos')}
              aria-pressed={vistaLista === 'egresos'}
              className={`rounded-full py-2 text-xs font-medium transition-colors sm:text-sm ${
                vistaLista === 'egresos' ? 'bg-coral text-bg' : 'text-text-dim'
              }`}
            >
              {t('cuentas.detalle.egresosTitulo')}
            </button>
          </div>

          {cargandoMovimientos && (
            <p className="px-2 text-sm text-text-dim">{t('home.cargandoMovimientos')}</p>
          )}

          {errorMovimientos && <MensajeError>{t('home.errorCargarMovimientos')}</MensajeError>}

          {errorEliminar && <MensajeError>{t('home.errorEliminarMovimiento')}</MensajeError>}

          {!cargandoMovimientos && !errorMovimientos && listaVisible.length === 0 && (
            <p className="rounded-2xl bg-panel p-4 text-sm text-text-dim">
              {vistaLista === 'ingresos'
                ? t('cuentas.detalle.sinIngresos')
                : t('cuentas.detalle.sinEgresos')}
            </p>
          )}

          {!cargandoMovimientos && !errorMovimientos && listaVisible.length > 0 && (
            <div className="flex flex-col gap-2 rounded-2xl bg-panel shadow-card p-2">
              {listaVisible.map((movimiento) => (
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

      {/* Crear (movimientoEditando null) pasa por el asistente; editar por
          HojaEditarMovimiento. abrirNuevoMovimiento/abrirEditarMovimiento
          arriba ponen movimientoEditando y hojaAbierta en el mismo evento
          (batched), así que este `if` nunca ve un estado intermedio raro. */}
      {movimientoEditando ? (
        <HojaEditarMovimiento
          abierta={hojaAbierta}
          onCerrar={cerrarHoja}
          cuentas={cuentas}
          tarjetas={tarjetas}
          categorias={categorias}
          onActualizar={(datos) => onActualizarMovimiento(movimientoEditando, datos)}
          movimientoEditando={movimientoEditando}
        />
      ) : (
        <AsistenteMovimiento
          abierta={hojaAbierta}
          onCerrar={cerrarHoja}
          cuentas={cuentas}
          tarjetas={tarjetas}
          categorias={categorias}
          cuentaPreseleccionadaId={cuenta.id}
          onGuardar={onAgregarMovimiento}
        />
      )}
    </main>
  )
}

export default DetalleCuenta
