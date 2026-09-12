import { fechaLocalISO } from '../../utils/formatoFecha'
import { MONEDA_POR_DEFECTO } from '../../utils/monedas'

// Reducer PURO del asistente de gasto de viaje paso a paso. Mismo patrón que
// components/asistente-movimiento/reductorAsistente.js (indicePaso +
// preselecciones), pero para el dominio de "gastos_viaje" (ver
// services/gastosViaje.js) -- COPIADO y adaptado, no compartido: son
// dominios distintos. No conoce flujosGastoViaje.js ni React;
// AsistenteGastoViaje.jsx combina este estado con flujosGastoViaje() para
// saber en qué paso está parado.
//
// A diferencia del movimiento (una sola moneda por perfil, sin fecha propia
// -- siempre "ahora"), un gasto de viaje tiene SU PROPIA moneda y una fecha
// libre (ver HojaNuevoGastoViaje.jsx) -- por eso el borrador nace con
// `moneda`/`fecha` ya resueltos (MONEDA_POR_DEFECTO y hoy) en vez de vacíos:
// no tienen paso propio, se ajustan como campos compactos dentro del paso
// 'monto' (ver pasos/PasoMontoGastoViaje.jsx).
export function estadoInicialGastoViaje({ categoriaPreseleccionadaId } = {}) {
  return {
    categoriaId: categoriaPreseleccionadaId ?? '',
    fecha: fechaLocalISO(),
    monto: '',
    moneda: MONEDA_POR_DEFECTO,
    descripcion: '',
    indicePaso: 0,
    // Se guarda tal cual en el borrador (en vez de leerse aparte) para que
    // flujosGastoViaje.js -- que solo recibe el borrador -- pueda decidir si
    // saltar el paso de categoría sin un segundo parámetro. Mismo criterio
    // que categoriaPreseleccionadaId en reductorAsistente.js.
    categoriaPreseleccionadaId: categoriaPreseleccionadaId ?? '',
  }
}

export function reductorGastoViaje(estado, accion) {
  switch (accion.tipo) {
    // Fusiona los campos que el paso actual acaba de resolver y avanza uno.
    case 'PARCHAR':
      return {
        ...estado,
        ...accion.cambios,
        indicePaso: estado.indicePaso + 1,
      }

    // Como PARCHAR, pero SIN avanzar de paso -- para campos que se van
    // tecleando/ajustando en vez de elegirse de una lista: el concepto, y
    // fecha/moneda dentro del paso de monto (ver PasoMontoGastoViaje.jsx).
    // Mismo criterio que ACTUALIZAR en reductorAsistente.js (BUG 1 de esa
    // fase: sin esto, un campo controlado por este reducer se perdería cada
    // vez que su paso se desmonta).
    case 'ACTUALIZAR':
      return {
        ...estado,
        ...accion.cambios,
      }

    case 'RETROCEDER':
      return {
        ...estado,
        indicePaso: Math.max(estado.indicePaso - 1, 0),
      }

    case 'IR_A_PASO':
      return {
        ...estado,
        indicePaso: Math.max(accion.indice, 0),
      }

    case 'REINICIAR':
      return estadoInicialGastoViaje(accion.preselecciones)

    default:
      return estado
  }
}
