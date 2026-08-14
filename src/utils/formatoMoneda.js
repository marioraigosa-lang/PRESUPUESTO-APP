import { configMoneda } from './monedas'

// Formatea un monto de SOLO LECTURA (tarjetas, listas, resúmenes) según la
// moneda activa. Usa Intl.NumberFormat para el agrupamiento de miles y
// decimales estándar del locale de cada moneda; el símbolo se agrega a
// mano (antes o después según la moneda) para poder mostrar "US$" en vez
// del "$" que Intl usaría por defecto para en-US, y así no confundirlo con
// el "$" de COP.
//
// El signo negativo se maneja aparte (formateando el valor absoluto y
// anteponiendo "-" al resultado completo) para que quede SIEMPRE al inicio
// ("-$5.000", "-US$5.000,00"), en vez de dejar que Intl lo meta entre el
// símbolo y el número ("$-5.000"), que es donde lo pone por defecto cuando
// el símbolo se agrega a mano antes del número.
export function formatearMonto(valor, moneda) {
  const config = configMoneda(moneda)
  const numero = Number(valor)
  const numeroSeguro = Number.isFinite(numero) ? numero : 0
  const esNegativo = numeroSeguro < 0

  const numeroFormateado = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: config.decimales,
    maximumFractionDigits: config.decimales,
  }).format(Math.abs(numeroSeguro))

  const montoConSimbolo =
    config.posicionSimbolo === 'despues'
      ? `${numeroFormateado} ${config.simbolo}`
      : `${config.simbolo}${numeroFormateado}`

  return esNegativo ? `-${montoConSimbolo}` : montoConSimbolo
}
