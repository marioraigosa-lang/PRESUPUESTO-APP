import { configMoneda } from './monedas'

// ============================================================================
// Parseo y formateo "mientras se escribe" para los campos de monto editables
// (HojaCuenta, HojaNuevoMovimiento, HojaGastoFijo, HojaCategoria,
// HojaNuevaMeta).
//
// La idea central: el estado de React SIEMPRE guarda un string numérico
// "canónico" -- solo dígitos y, cuando la moneda admite decimales, un único
// punto decimal (ej: "1000000" o "1000.5") -- sin importar qué separadores
// use la moneda activa para MOSTRARSE. Ese string canónico es justamente lo
// que entiende `Number(...)`, así que lo que se guarda en Supabase nunca
// depende de la moneda: siempre es el mismo número, se vea como se vea.
//
// limpiarEntradaMonto(): toma lo que el usuario acaba de teclear (texto ya
// con separadores aplicados) y lo reduce a ese string canónico, según las
// reglas de la moneda activa (qué caracter es "separador de miles" y cuál es
// "separador decimal" cambia entre COP/EUR y USD).
//
// formatearEntradaMonto(): toma el string canónico y lo vuelve a mostrar con
// el separador de miles y decimal de la moneda activa, preservando lo que el
// usuario está escribiendo en este instante (por ejemplo, un separador
// decimal al final sin dígitos todavía, que Intl.NumberFormat normalmente
// recortaría).
// ============================================================================

export function limpiarEntradaMonto(textoIngresado, moneda) {
  const config = configMoneda(moneda)

  if (config.decimales === 0) {
    // Moneda sin decimales (COP): solo dígitos, se descarta cualquier punto
    // o coma que el usuario haya escrito.
    return textoIngresado.replace(/\D/g, '')
  }

  // 1) Quita el separador de MILES de la moneda activa (',' en USD; '.' en
  // EUR). Así "1,234" (USD) o "1.234" (EUR) quedan en "1234" antes de tocar
  // los decimales.
  const regexSeparadorMiles = config.separadorMiles === '.' ? /\./g : /,/g
  let limpio = textoIngresado.replace(regexSeparadorMiles, '')

  // 2) Normaliza el separador DECIMAL de la moneda activa a '.' (el único
  // separador decimal que entiende Number(...)). En USD ya es '.', así que
  // este paso solo hace algo en EUR (',' -> '.').
  if (config.separadorDecimal === ',') {
    limpio = limpio.replace(/,/g, '.')
  }

  // 3) Descarta cualquier otro caracter que no sea dígito o punto.
  limpio = limpio.replace(/[^\d.]/g, '')

  // 4) Si quedó más de un punto (el usuario tecleó dos separadores
  // decimales), conserva solo el primero.
  const indicePrimerPunto = limpio.indexOf('.')
  if (indicePrimerPunto !== -1) {
    limpio =
      limpio.slice(0, indicePrimerPunto + 1) +
      limpio.slice(indicePrimerPunto + 1).replace(/\./g, '')
  }

  // 5) Trunca a la cantidad de decimales que admite la moneda (2 para
  // USD/EUR), para no guardar más precisión de la que se va a mostrar.
  const [entero, decimal] = limpio.split('.')
  if (decimal !== undefined) {
    limpio = `${entero}.${decimal.slice(0, config.decimales)}`
  }

  return limpio
}

export function formatearEntradaMonto(valorCanonico, moneda) {
  if (!valorCanonico) return ''

  const config = configMoneda(moneda)
  const [enteroCrudo, decimalCrudo] = valorCanonico.split('.')
  const enteroFormateado = new Intl.NumberFormat(config.locale).format(Number(enteroCrudo || 0))

  if (config.decimales === 0 || decimalCrudo === undefined) {
    return enteroFormateado
  }

  // decimalCrudo puede ser '' (el usuario acaba de escribir el separador
  // decimal y todavía no dígitos después) -- se conserva tal cual para no
  // "comerse" el separador mientras el usuario sigue escribiendo.
  return `${enteroFormateado}${config.separadorDecimal}${decimalCrudo}`
}
