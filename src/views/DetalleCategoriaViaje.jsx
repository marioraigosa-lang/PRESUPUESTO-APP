import { useState } from 'react'
import { Tag, Receipt } from 'lucide-react'
import GastoViaje from '../components/GastoViaje'
import HojaNuevoGastoViaje from '../components/HojaNuevoGastoViaje'
import AsistenteGastoViaje from '../components/asistente-gasto-viaje/AsistenteGastoViaje'
import IconoCategoria from '../components/IconoCategoria'
import FilaTotales from '../components/FilaTotales'
import { useIdioma } from '../context/IdiomaContext'
import { formatearMonto } from '../utils/formatoMoneda'
import { resumenCategoriaViaje, totalesPorMoneda } from '../utils/resumenViaje'
import { resolverIconoCategoria } from '../utils/resolverIconoCategoria'
import { COLORES_CUENTA } from '../utils/coloresCuenta'
import { USAR_ASISTENTE_GASTO_VIAJE } from '../utils/flags'
import BotonVolver from '../components/ui/BotonVolver'
import MensajeError from '../components/ui/MensajeError'
import Tarjeta from '../components/ui/Tarjeta'

// Mismo fallback que TarjetaCategoriaViaje.jsx/GastoViaje.jsx para una
// categoría sin "color" propio todavía.
const COLOR_FALLBACK = COLORES_CUENTA[0]

const CLASE_BARRA = {
  mint: 'bg-mint',
  gold: 'bg-gold',
  coral: 'bg-coral',
}

// Fase VIAJE-C del plan de viajes: "categorías navegables" -- calcado de
// DetalleCategoria.jsx (categorías reales de gasto variable), mismo molde:
// header con icono/color + presupuesto vs. ejecutado (FilaTotales), lista de
// gastos de ESA categoría, botón "+ Agregar gasto".
//
// A diferencia de DetalleCategoria.jsx, esta pantalla NO carga sus propios
// datos: DetalleViaje.jsx ya tiene categorías + gastos del viaje completo en
// memoria (una sola consulta con Promise.all) y le pasa acá el subconjunto
// de "gastos" ya filtrado por categoría -- no hace falta una query nueva.
//
// `categoria` es `null` para el caso especial "gastos sin categoría"
// (huérfanos por categoria_viaje_id = null, ver utils/resumenViaje.js): no
// tiene presupuesto/moneda propios, así que el header muestra solo el total
// por moneda en vez de presupuestado/gastado/restante, y no se puede crear
// un gasto nuevo desde acá (el formulario siempre exige elegir una
// categoría -- ver HojaNuevoGastoViaje.jsx) -- solo ver/editar/eliminar los
// que ya quedaron sueltos, para que ninguno quede inaccesible.
function DetalleCategoriaViaje({ categoria, gastos, categoriasViaje, onVolver, onAgregarGasto, onActualizarGasto, onEliminarGasto }) {
  const { t } = useIdioma()

  const [hojaGastoAbierta, setHojaGastoAbierta] = useState(false)
  const [gastoEditando, setGastoEditando] = useState(null)
  const [eliminandoGastoId, setEliminandoGastoId] = useState(null)
  const [errorEliminarGasto, setErrorEliminarGasto] = useState(null)

  const esSinCategoria = !categoria
  const colorCategoria = categoria ? categoria.color || COLOR_FALLBACK : null

  const { ejecutado, porcentaje, otrasMonedas } = esSinCategoria
    ? { ejecutado: 0, porcentaje: null, otrasMonedas: {} }
    : resumenCategoriaViaje(categoria, gastos)
  const tieneTope = !esSinCategoria && porcentaje !== null
  const colorBarra = porcentaje === null ? null : porcentaje > 100 ? 'coral' : porcentaje >= 75 ? 'gold' : 'mint'
  const anchoBarra = porcentaje === null ? 0 : Math.min(Math.max(porcentaje, 0), 100)
  const restante = categoria ? categoria.presupuesto - ejecutado : 0
  const otrasMonedasTexto = Object.entries(otrasMonedas)
    .map(([moneda, monto]) => formatearMonto(monto, moneda))
    .join(' · ')

  const totalesSinCategoria = esSinCategoria ? totalesPorMoneda(gastos) : {}

  const itemsTotales = esSinCategoria
    ? Object.entries(totalesSinCategoria).map(([moneda, monto]) => ({
        etiqueta: moneda,
        montoTexto: formatearMonto(monto, moneda),
        colorPunto: 'var(--color-gold)',
        colorTexto: 'text-text',
      }))
    : tieneTope
      ? [
          {
            etiqueta: t('viajes.detalle.presupuestoLabel'),
            montoTexto: formatearMonto(categoria.presupuesto, categoria.moneda),
            colorPunto: colorCategoria,
            colorTexto: 'text-text',
          },
          {
            etiqueta: t('viajes.detalle.gastadoTitulo'),
            montoTexto: formatearMonto(ejecutado, categoria.moneda),
            colorPunto: colorCategoria,
            colorTexto: 'text-text',
          },
          {
            etiqueta: t('viajes.detalle.restanteTitulo'),
            montoTexto: formatearMonto(restante, categoria.moneda),
            colorPunto: restante >= 0 ? 'var(--color-mint)' : 'var(--color-coral)',
            colorTexto: restante >= 0 ? 'text-mint' : 'text-coral',
          },
        ]
      : [
          {
            etiqueta: t('viajes.detalle.gastadoTitulo'),
            montoTexto: formatearMonto(ejecutado, categoria.moneda),
            colorPunto: colorCategoria,
            colorTexto: 'text-text',
          },
        ]

  function abrirCrearGasto() {
    setGastoEditando(null)
    setHojaGastoAbierta(true)
  }

  function abrirEditarGasto(gasto) {
    setGastoEditando(gasto)
    setHojaGastoAbierta(true)
  }

  function cerrarHojaGasto() {
    setHojaGastoAbierta(false)
    setGastoEditando(null)
  }

  async function manejarEliminarGasto(gasto) {
    const descripcion = gasto.descripcion?.trim() || t('viajes.detalle.gastoSinDescripcion')
    const confirmado = window.confirm(t('viajes.detalle.confirmarEliminarGasto', { descripcion }))
    if (!confirmado) return

    setErrorEliminarGasto(null)
    setEliminandoGastoId(gasto.id)

    try {
      await onEliminarGasto(gasto)
    } catch (err) {
      console.error(err)
      setErrorEliminarGasto(t('viajes.detalle.errorEliminarGasto'))
    } finally {
      setEliminandoGastoId(null)
    }
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pb-28">
        <header className="flex items-center gap-3">
          <BotonVolver
            onClick={onVolver}
            etiqueta={t('viajes.detalle.categoriasTitulo')}
            ariaLabel={t('viajes.detalle.volverCategoriasAria')}
          />
        </header>

        <section className="superficie-hero flex flex-col gap-4 rounded-2xl p-6 shadow-elevated">
          <div className="flex items-center gap-3">
            {esSinCategoria ? (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                <Tag className="h-6 w-6" aria-hidden="true" />
              </span>
            ) : (
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${colorCategoria}26` }}
              >
                <IconoCategoria nombre={resolverIconoCategoria(categoria)} color={colorCategoria} size="lg" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-text">
                {esSinCategoria ? t('viajes.detalle.gastoSinCategoria') : categoria.nombre}
              </h1>
              {esSinCategoria && (
                <p className="text-xs text-text-dim">{t('viajes.detalle.gastosSinCategoriaNota')}</p>
              )}
            </div>
          </div>

          {tieneTope && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className={`h-full rounded-full transition-all duration-500 ${CLASE_BARRA[colorBarra]}`}
                style={{ width: `${anchoBarra}%` }}
              />
            </div>
          )}

          {otrasMonedasTexto && (
            <p className="text-xs text-text-dim">
              {t('viajes.detalle.otrosGastosPrefijo')}
              {otrasMonedasTexto}
            </p>
          )}

          {itemsTotales.length > 0 && (
            <div className="border-t border-line pt-4">
              <FilaTotales items={itemsTotales} />
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
              {t('viajes.detalle.gastosTitulo')}
            </h2>
            {!esSinCategoria && (
              <button type="button" onClick={abrirCrearGasto} className="text-xs font-semibold text-mint">
                {t('viajes.detalle.nuevoGasto')}
              </button>
            )}
          </div>

          <MensajeError>{errorEliminarGasto}</MensajeError>

          {gastos.length === 0 && (
            <Tarjeta className="flex flex-col items-center gap-2 p-6 text-center">
              <Receipt className="h-6 w-6 text-text-dim" aria-hidden="true" />
              <p className="text-sm text-text-dim">{t('viajes.detalle.sinGastosCategoria')}</p>
            </Tarjeta>
          )}

          {gastos.map((gasto) => (
            <GastoViaje
              key={gasto.id}
              gasto={gasto}
              categoria={categoria}
              eliminando={eliminandoGastoId === gasto.id}
              onEditar={() => abrirEditarGasto(gasto)}
              onEliminar={() => manejarEliminarGasto(gasto)}
            />
          ))}
        </section>
      </div>

      {/* Fase VIAJE-D: crear pasa por el asistente paso a paso con el flag
          activo, editar siempre por HojaNuevoGastoViaje -- mismo criterio
          que DetalleCategoria.jsx con el asistente de movimiento. Se monta
          también en modo "sin categoría" para poder EDITAR un gasto huérfano
          (y asignarle una categoría real ahí mismo) -- solo el botón
          "+ Agregar gasto" de arriba está oculto para ese modo, ya que
          ninguno de los dos permite elegir "sin categoría" al crear, así que
          no tiene sentido "crear" un gasto sin categoría desde acá. */}
      {USAR_ASISTENTE_GASTO_VIAJE && !gastoEditando ? (
        <AsistenteGastoViaje
          abierta={hojaGastoAbierta}
          onCerrar={cerrarHojaGasto}
          categorias={categoriasViaje}
          categoriaPreseleccionadaId={categoria?.id}
          onGuardar={onAgregarGasto}
        />
      ) : (
        <HojaNuevoGastoViaje
          abierta={hojaGastoAbierta}
          gastoEditando={gastoEditando}
          categorias={categoriasViaje}
          categoriaPreseleccionadaId={categoria?.id}
          onCerrar={cerrarHojaGasto}
          onGuardar={onAgregarGasto}
          onActualizar={onActualizarGasto}
        />
      )}
    </main>
  )
}

export default DetalleCategoriaViaje
