import { useState } from 'react'
import { CreditCard } from 'lucide-react'
import Movimiento from '../components/Movimiento'
import SelectorPeriodo from '../components/SelectorPeriodo'
import HojaNuevoMovimiento from '../components/HojaNuevoMovimiento'
import HojaPagoTarjeta from '../components/HojaPagoTarjeta'
import FilaTotales from '../components/FilaTotales'
import { useIdioma } from '../context/IdiomaContext'
import { useFormatoMoneda } from '../context/MonedaContext'
import { useMovimientosPeriodo } from '../hooks/useMovimientosPeriodo'
import BotonVolver from '../components/ui/BotonVolver'
import MensajeError from '../components/ui/MensajeError'
import { calcularResumenTarjeta } from '../utils/movimientosTarjeta'

const hoy = new Date()

// Pantalla de detalle de una tarjeta puntual (Fase 5 del plan de tarjetas de
// crédito): calco de DetalleCuenta.jsx, con dos diferencias de fondo:
//   - La lista de abajo muestra TODOS los movimientos de la tarjeta (gastos
//     Y pagos, no solo un subconjunto como "ingresos y traslados" en
//     DetalleCuenta) -- useMovimientosPeriodo con `tarjetaId` ya trae
//     exactamente esos dos tipos, ninguno más (ver
//     construirConsultaMovimientosPeriodo).
//   - No hay botón "+ Nuevo movimiento": esta pantalla no crea gastos
//     nuevos (eso sigue siendo el flujo de HojaNuevoMovimiento de siempre,
//     con la tarjeta como una opción de origen -- Fase 4), solo permite
//     editar/borrar un gasto existente y pagar la tarjeta. Por eso
//     HojaNuevoMovimiento se abre acá SOLO en modo edición
//     (movimientoEditando siempre viene seteado); `onGuardar` nunca llega a
//     invocarse, así que se le pasa un no-op.
//
// Se abre al tocar una tarjeta en Home.jsx, con el mismo patrón de "modo"
// interno (no toca el `vista` de App.jsx) que ya usan DetalleCuenta/
// DetalleCategoria.
function DetalleTarjeta({
  tarjeta,
  cuentas,
  tarjetas,
  categorias,
  movimientosVersion,
  onVolver,
  onActualizarMovimiento,
  onEliminarMovimiento,
  onPagarTarjeta,
}) {
  const { t } = useIdioma()
  const formatear = useFormatoMoneda()

  const [periodo, setPeriodo] = useState({ mes: hoy.getMonth(), anio: hoy.getFullYear() })
  const [hojaAbierta, setHojaAbierta] = useState(false)
  const [movimientoEditando, setMovimientoEditando] = useState(null)
  const [hojaPagoAbierta, setHojaPagoAbierta] = useState(false)
  const [eliminandoId, setEliminandoId] = useState(null)
  const [errorEliminar, setErrorEliminar] = useState(null)

  const {
    datos: movimientos,
    cargando: cargandoMovimientos,
    error: errorMovimientos,
    establecerDatos: setMovimientos,
  } = useMovimientosPeriodo({ periodo, version: movimientosVersion, tarjetaId: tarjeta.id })

  const { totalGastado, totalPagado, neto } = calcularResumenTarjeta(movimientos)

  const porcentajeUsado =
    tarjeta.cupo_total > 0 ? Math.min(100, Math.round((tarjeta.deuda / tarjeta.cupo_total) * 100)) : 0

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

  function abrirEditarMovimiento(movimiento) {
    // Un pago a tarjeta no se puede editar (ver services/movimientos.js) y
    // un movimiento de gasto fijo tampoco -- Movimiento.jsx ya oculta el
    // lápiz en ambos casos, esto es la misma defensa doble que ya usan
    // DetalleCuenta/DetalleCategoria con gasto_fijo_id.
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

    const confirmado = window.confirm(
      movimiento.tipo === 'pago_tarjeta'
        ? t('tarjetas.detalle.confirmarEliminarPago', { descripcion: movimiento.descripcion })
        : t('home.confirmarEliminarMovimiento', { descripcion: movimiento.descripcion }),
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
          <BotonVolver onClick={onVolver} etiqueta={t('nav.inicio')} ariaLabel={t('tarjetas.detalle.volverAria')} />
        </header>

        <section className="superficie-hero flex flex-col gap-4 rounded-2xl p-5 shadow-elevated">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-bg"
              style={{ backgroundColor: tarjeta.color }}
            >
              <CreditCard className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-text">{tarjeta.nombre}</h1>
              <p className="truncate text-xs text-text-dim">
                {t('tarjetas.cupoTotalLabel')}: {formatear(tarjeta.cupo_total)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-text-dim">{t('tarjetas.deudaLabel')}</p>
            <p className="text-xl font-bold text-text">{formatear(tarjeta.deuda)}</p>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full"
              style={{
                width: `${porcentajeUsado}%`,
                backgroundColor: tarjeta.deuda > 0 ? 'var(--color-coral)' : 'var(--color-mint)',
              }}
            />
          </div>

          <div className="flex items-center justify-between border-t border-line pt-4">
            <p className="text-sm font-semibold text-mint">
              {t('tarjetas.disponibleLabel')}: {formatear(tarjeta.cupo_disponible)}
            </p>
          </div>
        </section>

        <button
          type="button"
          onClick={() => setHojaPagoAbierta(true)}
          disabled={tarjeta.deuda <= 0}
          className="w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg disabled:opacity-60"
        >
          {t('tarjetas.detalle.pagarTarjeta')}
        </button>

        <SelectorPeriodo
          periodo={periodo}
          onMesAnterior={irMesAnterior}
          onMesSiguiente={irMesSiguiente}
          mostrarQuincena={false}
        />

        <FilaTotales
          items={[
            {
              etiqueta: t('tarjetas.detalle.gastadoTitulo'),
              montoTexto: formatear(totalGastado),
              colorPunto: 'var(--color-coral)',
              colorTexto: 'text-coral',
            },
            {
              etiqueta: t('tarjetas.detalle.pagadoTitulo'),
              montoTexto: formatear(totalPagado),
              colorPunto: 'var(--color-mint)',
              colorTexto: 'text-mint',
            },
            {
              etiqueta: t('tarjetas.detalle.netoTitulo'),
              montoTexto: formatear(neto),
              colorPunto: neto > 0 ? 'var(--color-coral)' : 'var(--color-mint)',
              colorTexto: neto > 0 ? 'text-coral' : 'text-mint',
            },
          ]}
        />

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
            {t('tarjetas.detalle.listaTitulo')}
          </h2>

          {cargandoMovimientos && (
            <p className="px-2 text-sm text-text-dim">{t('home.cargandoMovimientos')}</p>
          )}

          {errorMovimientos && <MensajeError>{t('home.errorCargarMovimientos')}</MensajeError>}

          {errorEliminar && <MensajeError>{t('home.errorEliminarMovimiento')}</MensajeError>}

          {!cargandoMovimientos && !errorMovimientos && movimientos.length === 0 && (
            <p className="rounded-2xl bg-panel p-4 text-sm text-text-dim">
              {t('tarjetas.detalle.sinMovimientos')}
            </p>
          )}

          {!cargandoMovimientos && !errorMovimientos && movimientos.length > 0 && (
            <div className="flex flex-col gap-2 rounded-2xl bg-panel shadow-card p-2">
              {movimientos.map((movimiento) => (
                <Movimiento
                  key={movimiento.id}
                  movimiento={movimiento}
                  tarjetaContextoId={tarjeta.id}
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
        tarjetas={tarjetas}
        categorias={categorias}
        onGuardar={() => {}}
        onActualizar={(datos) => onActualizarMovimiento(movimientoEditando, datos)}
        movimientoEditando={movimientoEditando}
      />

      <HojaPagoTarjeta
        abierta={hojaPagoAbierta}
        onCerrar={() => setHojaPagoAbierta(false)}
        tarjeta={tarjeta}
        cuentas={cuentas}
        onConfirmar={(datos) => onPagarTarjeta(tarjeta, datos)}
      />
    </main>
  )
}

export default DetalleTarjeta
