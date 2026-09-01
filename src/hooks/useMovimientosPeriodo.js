import { useDatosUsuario } from '../lib/datosUsuario'
import { useConsulta } from './useConsulta'
import { useIdioma } from '../context/IdiomaContext'
import { rangoFechasPeriodo } from '../utils/formatoPeriodo'
import { mapearMovimiento } from '../utils/mapearMovimiento'
import { construirConsultaMovimientosPeriodo } from '../utils/consultaMovimientosPeriodo'

// "cuenta:cuentas!cuenta_id(...)" y "cuenta_destino:cuentas!cuenta_destino_id(...)":
// movimientos tiene DOS llaves foráneas hacia cuentas (origen y destino,
// esta última para traslados), así que hay que indicarle a Supabase con
// cuál de las dos se hace cada unión; sin el "!columna" la consulta queda
// ambigua y falla.
const COLUMNAS =
  'id, tipo, descripcion, monto, emoji, fecha, cuenta_id, cuenta_destino_id, categoria_id, gasto_fijo_id, cuenta:cuentas!cuenta_id(nombre), cuenta_destino:cuentas!cuenta_destino_id(nombre)'

// Motor de datos compartido para "movimientos de un periodo": la misma
// consulta que antes vivía solo dentro de MovimientosRecientes.jsx (Home),
// generalizada para que también la usen las pantallas de detalle de
// cuenta/categoría (Fase 1+), sin duplicar el select ni la conversión de
// fecha/nombre para mostrar.
//
// - `periodo`: { mes, anio, quincena } -- igual que rangoFechasPeriodo.
//   `quincena` es opcional (rangoFechasPeriodo ya asume 'completo' si se
//   omite), así que las pantallas que solo filtran por mes (sin quincena,
//   como el detalle de cuenta) pueden pasar solo { mes, anio }.
// - `cuentaId`: si se pasa, solo trae movimientos donde esa cuenta sea el
//   ORIGEN o el DESTINO -- así un traslado aparece en el detalle de AMBAS
//   cuentas involucradas, no solo en la de origen.
// - `categoriaId`: si se pasa, solo trae movimientos de esa categoría. Los
//   traslados nunca tienen categoria_id, así que nunca aparecen acá -- es
//   el comportamiento esperado (no hace falta excluirlos a mano).
// - `limite`: si se pasa, corta el resultado a esa cantidad (Home solo
//   muestra los más recientes); si se omite, trae todos los del periodo.
//
// El filtrado por cuenta/categoría se arma acá, en la capa de consulta del
// componente -- services/movimientos.js (que está bajo test) no cambia:
// esas funciones solo mutan datos, nunca deciden qué se lista en pantalla.
export function useMovimientosPeriodo({ periodo, version, cuentaId, categoriaId, limite } = {}) {
  const { seleccionarPropio } = useDatosUsuario()
  const { idioma, t } = useIdioma()

  async function cargarMovimientos() {
    const { desde, hasta } = rangoFechasPeriodo(periodo.anio, periodo.mes, periodo.quincena)

    const consulta = construirConsultaMovimientosPeriodo(seleccionarPropio('movimientos', COLUMNAS), {
      desde,
      hasta,
      cuentaId,
      categoriaId,
      limite,
    })

    const { data, error } = await consulta

    if (error) {
      throw new Error(error.message)
    }

    return data.map((movimiento) => mapearMovimiento(movimiento, t, idioma))
  }

  return useConsulta(
    cargarMovimientos,
    [version, periodo.anio, periodo.mes, periodo.quincena, cuentaId, categoriaId, limite],
    [],
  )
}
