import { traducir } from '../i18n'

// `idioma` es opcional (por defecto 'es') a propósito: así los llamadores
// que todavía no pasan el idioma activo (ej. utilidades de fases futuras
// que no reciben ese dato) siguen viendo español, el comportamiento de
// antes, en vez de romper.
export function tituloMes(mes, anio, idioma = 'es') {
  const nombre = traducir(idioma, 'comun.meses')[mes]
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`
}

export function etiquetaQuincena(quincena, idioma = 'es') {
  return traducir(idioma, `comun.quincena.${quincena}`)
}

export function textoPeriodo({ mes, anio, quincena }, idioma = 'es') {
  return `${etiquetaQuincena(quincena, idioma)} · ${tituloMes(mes, anio, idioma)}`
}

// Rango 'YYYY-MM-DD' (desde/hasta, ambos inclusive) para filtrar movimientos
// por año completo (mes === null), por un mes específico (mes: 0-11) o, si se
// indica `quincena`, por la mitad de ese mes: 'primera' (día 1 al 15) o
// 'segunda' (día 16 al último día del mes, que varía según el mes/año). Con
// quincena === 'completo' (o sin indicarla) se devuelve el mes entero, igual
// que antes.
export function rangoFechasPeriodo(anio, mes, quincena = 'completo') {
  if (mes === null) {
    return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` }
  }

  const mesStr = String(mes + 1).padStart(2, '0')
  const ultimoDia = new Date(anio, mes + 1, 0).getDate()

  if (quincena === 'primera') {
    return { desde: `${anio}-${mesStr}-01`, hasta: `${anio}-${mesStr}-15` }
  }

  if (quincena === 'segunda') {
    return { desde: `${anio}-${mesStr}-16`, hasta: `${anio}-${mesStr}-${String(ultimoDia).padStart(2, '0')}` }
  }

  return { desde: `${anio}-${mesStr}-01`, hasta: `${anio}-${mesStr}-${String(ultimoDia).padStart(2, '0')}` }
}

// Cuántos meses de `anio` ya transcurrieron (incluyendo el actual), para
// estimar gastos fijos acumulados en un año sin contar meses futuros.
export function mesesTranscurridosEnAnio(anio) {
  const hoy = new Date()
  if (anio < hoy.getFullYear()) return 12
  if (anio > hoy.getFullYear()) return 0
  return hoy.getMonth() + 1
}
