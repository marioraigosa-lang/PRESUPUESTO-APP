import { MONEDA_POR_DEFECTO } from '../../utils/monedas'
import { limpiarEntradaMonto, formatearEntradaMonto } from '../../utils/inputMoneda'
import { CATEGORIAS_POR_DEFECTO } from '../../services/categoriasViaje'

// Reducer PURO del asistente de crear viaje paso a paso. Mismo patrón que
// los otros dos asistentes (indicePaso, PARCHAR/ACTUALIZAR/RETROCEDER/
// IR_A_PASO/REINICIAR) -- COPIADO y adaptado, no compartido: "viajes" es un
// dominio propio (ver services/viajes.js), sin preselecciones (a diferencia
// de gasto de viaje o movimiento: crear un viaje siempre arranca de cero,
// no hay un "desde dónde" que precargue nada).
//
// Categorías marcadas por defecto en el paso 4: las 4 más universales en
// cualquier viaje (tiquetes, transporte, alimentación, hotel) --
// actividades/compras/souvenirs/otros quedan desmarcadas, más discrecionales,
// a un toque de sumarse si aplican. Recomendación de producto, fácil de
// ajustar acá si no cuadra en la práctica.
const CLAVES_SELECCIONADAS_POR_DEFECTO = new Set(['tiquetes', 'transporte', 'alimentacion', 'hotel'])

function categoriasIniciales() {
  return Object.fromEntries(
    CATEGORIAS_POR_DEFECTO.map(({ clave }) => [
      clave,
      { seleccionada: CLAVES_SELECCIONADAS_POR_DEFECTO.has(clave), presupuesto: '' },
    ]),
  )
}

export function estadoInicialViaje() {
  return {
    origen: '',
    destino: '',
    fechaDesde: '',
    fechaHasta: '',
    adultos: '1',
    ninos: '0',
    // Una sola moneda para TODOS los presupuestos del paso 4 -- a diferencia
    // de un gasto de viaje (cada uno puede ser de una moneda distinta), acá
    // se está sembrando el plan de UN viaje de una sola vez; elegir moneda
    // categoría por categoría sería fricción sin beneficio real (el usuario
    // puede ajustarla después, categoría por categoría, desde el detalle del
    // viaje si de verdad la necesita distinta).
    monedaCategorias: MONEDA_POR_DEFECTO,
    categorias: categoriasIniciales(),
    indicePaso: 0,
  }
}

export function reductorViaje(estado, accion) {
  switch (accion.tipo) {
    // Fusiona los campos que el paso actual acaba de resolver y avanza uno.
    case 'PARCHAR':
      return {
        ...estado,
        ...accion.cambios,
        indicePaso: estado.indicePaso + 1,
      }

    // Como PARCHAR, pero SIN avanzar de paso -- para campos que se van
    // tecleando/ajustando (origen, destino, fechas, personas) en vez de
    // elegirse de una lista. Mismo criterio que ACTUALIZAR en los otros dos
    // reducers.
    case 'ACTUALIZAR':
      return {
        ...estado,
        ...accion.cambios,
      }

    // Prende/apaga una categoría del paso 4. Al DESMARCARLA se limpia su
    // presupuesto -- si se vuelve a marcar más tarde, empieza en blanco en
    // vez de reaparecer con un monto que el usuario ya había "descartado" al
    // desmarcarla.
    case 'ALTERNAR_CATEGORIA': {
      const actual = estado.categorias[accion.clave]
      return {
        ...estado,
        categorias: {
          ...estado.categorias,
          [accion.clave]: {
            seleccionada: !actual.seleccionada,
            presupuesto: actual.seleccionada ? '' : actual.presupuesto,
          },
        },
      }
    }

    case 'CAMBIAR_PRESUPUESTO_CATEGORIA':
      return {
        ...estado,
        categorias: {
          ...estado.categorias,
          [accion.clave]: { ...estado.categorias[accion.clave], presupuesto: accion.presupuesto },
        },
      }

    // Al cambiar la moneda compartida, reinterpreta cada presupuesto YA
    // escrito con las reglas de separadores de la moneda nueva -- mismo
    // criterio que HojaNuevoGastoViaje.jsx / PasoMontoGastoViaje.jsx, pero
    // aplicado a TODAS las categorías con presupuesto a la vez en vez de a
    // un solo campo.
    case 'CAMBIAR_MONEDA_CATEGORIAS': {
      const monedaAnterior = estado.monedaCategorias
      const categoriasReinterpretadas = Object.fromEntries(
        Object.entries(estado.categorias).map(([clave, datos]) => [
          clave,
          {
            ...datos,
            presupuesto: datos.presupuesto
              ? limpiarEntradaMonto(formatearEntradaMonto(datos.presupuesto, monedaAnterior), accion.moneda)
              : datos.presupuesto,
          },
        ]),
      )
      return { ...estado, monedaCategorias: accion.moneda, categorias: categoriasReinterpretadas }
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
      return estadoInicialViaje()

    default:
      return estado
  }
}
