import { mesAnioLargoDesdeISO, parsearFechaISO } from './formatoFecha'

const UMBRAL_HOLGADO = 1.1

// Meses completos entre dos fechas (redondea hacia abajo si el día del mes
// objetivo aún no se cumple). Puede dar negativo si `objetivo` ya pasó.
function mesesEntre(hoy, objetivo) {
  let meses = (objetivo.getFullYear() - hoy.getFullYear()) * 12 + (objetivo.getMonth() - hoy.getMonth())
  if (objetivo.getDate() < hoy.getDate()) meses -= 1
  return meses
}

// `formatear` es la función devuelta por useFormatoMoneda() en el
// componente que llama a esta función: así el mensaje respeta la moneda
// activa del usuario sin que este util (que no es un componente/hook) tenga
// que leer el contexto de moneda directamente.
export function generarRecomendacionMeta({
  ahorroActual,
  capacidadAhorroMensual,
  fechaObjetivo,
  montoObjetivo,
  formatear,
}) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const objetivo = parsearFechaISO(fechaObjetivo)
  const fechaTexto = mesAnioLargoDesdeISO(fechaObjetivo)

  if (objetivo < hoy) {
    return {
      tono: 'alerta',
      mensaje: `📅 La fecha objetivo (${fechaTexto}) ya pasó. Actualiza la fecha de tu meta para ver una proyección real.`,
    }
  }

  if (capacidadAhorroMensual < 0) {
    return {
      tono: 'alerta',
      mensaje: `⚠️ Tus gastos superan tus ingresos por ${formatear(
        Math.round(Math.abs(capacidadAhorroMensual)),
      )}; tu ahorro no crece. Equilibra tu presupuesto antes de la meta.`,
    }
  }

  const mesesRestantes = Math.max(mesesEntre(hoy, objetivo), 0)
  const proyeccion = ahorroActual + capacidadAhorroMensual * mesesRestantes
  const porcentaje = montoObjetivo > 0 ? proyeccion / montoObjetivo : 0

  if (porcentaje >= UMBRAL_HOLGADO) {
    return {
      tono: 'positivo',
      mensaje: `🎉 ¡Vas sobrado! A este ritmo alcanzas tu meta antes de ${fechaTexto}. Podrías subir la meta.`,
    }
  }

  if (porcentaje >= 1) {
    return {
      tono: 'positivo',
      mensaje: `✅ Vas en camino. Ahorrando ${formatear(
        Math.round(capacidadAhorroMensual),
      )} al mes llegas a tu meta para ${fechaTexto}.`,
    }
  }

  const diferencia = montoObjetivo - proyeccion
  const necesarioMensual = mesesRestantes > 0 ? (montoObjetivo - ahorroActual) / mesesRestantes : montoObjetivo - ahorroActual
  const recorteMensual = necesarioMensual - capacidadAhorroMensual

  return {
    tono: 'aviso',
    mensaje: `📊 A tu ritmo llegarás a ${formatear(
      Math.round(proyeccion),
    )}, te faltarían ${formatear(Math.round(diferencia))}. Para lograrla necesitas ahorrar ${formatear(
      Math.round(necesarioMensual),
    )} al mes (ahora ahorras ${formatear(
      Math.round(capacidadAhorroMensual),
    )}). Opciones: recorta ${formatear(
      Math.round(recorteMensual),
    )} en gastos, o ajusta tu meta a ${formatear(Math.round(proyeccion))} o mueve la fecha.`,
  }
}
