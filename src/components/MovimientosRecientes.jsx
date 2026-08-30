import { useState } from 'react'
import Movimiento from './Movimiento'
import { useMovimientosPeriodo } from '../hooks/useMovimientosPeriodo'
import { useIdioma } from '../context/IdiomaContext'
import MensajeError from './ui/MensajeError'

const MAXIMO_VISIBLE = 8

function MovimientosRecientes({ version, periodo, onEditarMovimiento, onEliminarMovimiento }) {
  const { t } = useIdioma()
  const [eliminandoId, setEliminandoId] = useState(null)
  const [errorEliminar, setErrorEliminar] = useState(null)

  const {
    datos: movimientos,
    cargando: cargandoMovimientos,
    error: errorMovimientos,
    establecerDatos: setMovimientos,
  } = useMovimientosPeriodo({ periodo, version, limite: MAXIMO_VISIBLE })

  async function manejarEliminar(movimiento) {
    if (movimiento.gasto_fijo_id) return

    const confirmado = window.confirm(
      movimiento.tipo === 'traslado'
        ? t('home.confirmarEliminarTraslado', { descripcion: movimiento.descripcion })
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
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
        {t('home.movimientosTitulo')}
      </h2>

      {cargandoMovimientos && (
        <p className="px-2 text-sm text-text-dim">{t('home.cargandoMovimientos')}</p>
      )}

      {errorMovimientos && <MensajeError>{t('home.errorCargarMovimientos')}</MensajeError>}

      {errorEliminar && <MensajeError>{t('home.errorEliminarMovimiento')}</MensajeError>}

      {!cargandoMovimientos && !errorMovimientos && movimientos.length === 0 && (
        <p className="rounded-2xl bg-panel p-4 text-sm text-text-dim">
          {t('home.sinMovimientos')}
        </p>
      )}

      {!cargandoMovimientos && !errorMovimientos && movimientos.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl bg-panel shadow-card p-2">
          {movimientos.map((movimiento) => (
            <Movimiento
              key={movimiento.id}
              movimiento={movimiento}
              eliminando={eliminandoId === movimiento.id}
              onEditar={() => onEditarMovimiento(movimiento)}
              onEliminar={() => manejarEliminar(movimiento)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default MovimientosRecientes
