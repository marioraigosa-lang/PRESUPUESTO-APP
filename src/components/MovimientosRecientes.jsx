import { useState } from 'react'
import Movimiento from './Movimiento'
import { useDatosUsuario } from '../lib/datosUsuario'
import { useConsulta } from '../hooks/useConsulta'
import { useIdioma } from '../context/IdiomaContext'
import { fechaCortaDesdeISO } from '../utils/formatoFecha'
import { rangoFechasPeriodo } from '../utils/formatoPeriodo'

const MAXIMO_VISIBLE = 8

function MovimientosRecientes({ version, periodo, onEditarMovimiento, onEliminarMovimiento }) {
  const { seleccionarPropio } = useDatosUsuario()
  const { idioma, t } = useIdioma()
  const [eliminandoId, setEliminandoId] = useState(null)
  const [errorEliminar, setErrorEliminar] = useState(null)

  async function cargarMovimientos() {
    const { desde, hasta } = rangoFechasPeriodo(periodo.anio, periodo.mes, periodo.quincena)

    // "cuenta:cuentas!cuenta_id(...)" y "cuenta_destino:cuentas!cuenta_destino_id(...)":
    // movimientos tiene DOS llaves foráneas hacia cuentas (origen y
    // destino, esta última para traslados), así que hay que indicarle a
    // Supabase con cuál de las dos se hace cada unión; sin el "!columna"
    // la consulta queda ambigua y falla.
    const { data, error } = await seleccionarPropio(
      'movimientos',
      'id, tipo, descripcion, monto, emoji, fecha, cuenta_id, cuenta_destino_id, categoria_id, gasto_fijo_id, cuenta:cuentas!cuenta_id(nombre), cuenta_destino:cuentas!cuenta_destino_id(nombre)',
    )
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: false })
      .order('creado_en', { ascending: false })
      .limit(MAXIMO_VISIBLE)

    if (error) {
      throw new Error(error.message)
    }

    return data.map((movimiento) => ({
      ...movimiento,
      cuenta: movimiento.cuenta?.nombre ?? t('home.sinCuenta'),
      cuentaDestino: movimiento.cuenta_destino?.nombre ?? null,
      fecha: fechaCortaDesdeISO(movimiento.fecha, idioma),
    }))
  }

  const {
    datos: movimientos,
    cargando: cargandoMovimientos,
    error: errorMovimientos,
    establecerDatos: setMovimientos,
  } = useConsulta(cargarMovimientos, [version, periodo.anio, periodo.mes, periodo.quincena], [])

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
      setErrorEliminar(error.message)
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

      {errorMovimientos && (
        <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {t('home.errorCargarMovimientos')}
          {errorMovimientos}
        </p>
      )}

      {errorEliminar && (
        <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {t('home.errorEliminarMovimiento')}
          {errorEliminar}
        </p>
      )}

      {!cargandoMovimientos && !errorMovimientos && movimientos.length === 0 && (
        <p className="rounded-2xl bg-panel p-4 text-sm text-text-dim">
          {t('home.sinMovimientos')}
        </p>
      )}

      {!cargandoMovimientos && !errorMovimientos && movimientos.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl bg-panel p-2">
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
