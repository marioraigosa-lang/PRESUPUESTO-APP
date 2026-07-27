import { traducir } from '../i18n'

// `idioma` es opcional (por defecto 'es') por la misma razón que en
// formatoPeriodo.js: los llamadores que todavía no pasan el idioma activo
// (ej. proyeccionMeta.js, que genera mensajes financieros que se traducirán
// en una fase posterior) siguen viendo español sin tener que actualizarse.
export function fechaCorta(fecha = new Date(), idioma = 'es') {
  return `${fecha.getDate()} ${traducir(idioma, 'comun.mesesAbrev')[fecha.getMonth()]}`
}

// Arma 'YYYY-MM-DD' con la fecha LOCAL del dispositivo (no UTC), para que un
// movimiento guardado de noche en Colombia (UTC-5) no quede fechado al día
// siguiente como pasaría con `new Date().toISOString()`.
export function fechaLocalISO(fecha = new Date()) {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

export function fechaCortaDesdeISO(fechaIso, idioma = 'es') {
  const [anio, mes, dia] = fechaIso.slice(0, 10).split('-').map(Number)
  return fechaCorta(new Date(anio, mes - 1, dia), idioma)
}

// Convierte un date/text 'YYYY-MM-DD' de Supabase en un Date local (evita el
// corrimiento de un día que da `new Date('YYYY-MM-DD')` por interpretarlo en UTC).
export function parsearFechaISO(fechaIso) {
  const [anio, mes, dia] = fechaIso.slice(0, 10).split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

export function mesAnioLargoDesdeISO(fechaIso, idioma = 'es') {
  const fecha = parsearFechaISO(fechaIso)
  return `${traducir(idioma, 'comun.meses')[fecha.getMonth()]} ${fecha.getFullYear()}`
}

// Fecha 'YYYY-MM-DD' para registrar el pago de un gasto fijo en el mes que el
// usuario tiene seleccionado en el selector de periodo. Si ese mes es el mes
// actual, usa la fecha real de hoy (igual que antes). Si es otro mes (pasado
// o futuro), usa el día de pago del gasto fijo dentro de ESE mes -- o el
// día 1 si no tiene día de pago definido -- recortado al último día del mes
// para nunca generar una fecha inválida (p. ej. día 31 en febrero).
export function fechaPagoEnPeriodo(anio, mes, diaPago) {
  const hoy = new Date()
  const esMesActual = anio === hoy.getFullYear() && mes === hoy.getMonth()

  if (esMesActual) {
    return fechaLocalISO(hoy)
  }

  const ultimoDiaDelMes = new Date(anio, mes + 1, 0).getDate()
  const dia = Math.min(diaPago && diaPago > 0 ? diaPago : 1, ultimoDiaDelMes)
  return fechaLocalISO(new Date(anio, mes, dia))
}
