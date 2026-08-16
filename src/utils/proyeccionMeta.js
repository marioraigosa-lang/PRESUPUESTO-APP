import { mesAnioLargoDesdeISO, parsearFechaISO } from './formatoFecha'

const UMBRAL_HOLGADO = 1.1

// Meses completos entre dos fechas (redondea hacia abajo si el día del mes
// objetivo aún no se cumple). Puede dar negativo si `objetivo` ya pasó.
function mesesEntre(hoy, objetivo) {
  let meses = (objetivo.getFullYear() - hoy.getFullYear()) * 12 + (objetivo.getMonth() - hoy.getMonth())
  if (objetivo.getDate() < hoy.getDate()) meses -= 1
  return meses
}

// Devuelve la CLAVE de traducción del mensaje (no el texto ya armado) más
// los VALORES a interpolar en ella: mismo patrón que mensajeFondo.js. Este
// util no es un componente y no conoce el idioma activo, así que quien
// llama (TarjetaMeta.jsx) arma la frase final con t(clave, valores).
//
// `formatear` es la función devuelta por useFormatoMoneda() (para que los
// montos respeten la moneda activa) e `idioma` es el idioma activo de
// useIdioma() (para que la fecha objetivo salga en el idioma correcto);
// ambos vienen del componente porque este util no tiene acceso al contexto.
export function generarRecomendacionMeta({
  ahorroActual,
  capacidadAhorroMensual,
  fechaObjetivo,
  montoObjetivo,
  formatear,
  idioma = 'es',
}) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const objetivo = parsearFechaISO(fechaObjetivo)
  const fechaTexto = mesAnioLargoDesdeISO(fechaObjetivo, idioma)

  if (objetivo < hoy) {
    return {
      tono: 'alerta',
      clave: 'emergencia.proyeccion.fechaPasada',
      valores: { fecha: fechaTexto },
    }
  }

  if (capacidadAhorroMensual < 0) {
    return {
      tono: 'alerta',
      clave: 'emergencia.proyeccion.capacidadNegativa',
      valores: { exceso: formatear(Math.round(Math.abs(capacidadAhorroMensual))) },
    }
  }

  const mesesRestantes = Math.max(mesesEntre(hoy, objetivo), 0)
  const proyeccion = ahorroActual + capacidadAhorroMensual * mesesRestantes
  const porcentaje = montoObjetivo > 0 ? proyeccion / montoObjetivo : 0

  if (porcentaje >= UMBRAL_HOLGADO) {
    return {
      tono: 'positivo',
      clave: 'emergencia.proyeccion.sobrado',
      valores: { fecha: fechaTexto },
    }
  }

  if (porcentaje >= 1) {
    return {
      tono: 'positivo',
      clave: 'emergencia.proyeccion.enCamino',
      valores: {
        ahorroMensual: formatear(Math.round(capacidadAhorroMensual)),
        fecha: fechaTexto,
      },
    }
  }

  const diferencia = montoObjetivo - proyeccion
  const necesarioMensual = mesesRestantes > 0 ? (montoObjetivo - ahorroActual) / mesesRestantes : montoObjetivo - ahorroActual
  const recorteMensual = necesarioMensual - capacidadAhorroMensual

  return {
    tono: 'aviso',
    clave: 'emergencia.proyeccion.noAlcanza',
    valores: {
      proyeccion: formatear(Math.round(proyeccion)),
      diferencia: formatear(Math.round(diferencia)),
      necesario: formatear(Math.round(necesarioMensual)),
      ahorroMensual: formatear(Math.round(capacidadAhorroMensual)),
      recorte: formatear(Math.round(recorteMensual)),
    },
  }
}
