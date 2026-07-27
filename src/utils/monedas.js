// Configuración de las 3 monedas soportadas por la app. No hay conversión
// entre monedas: el número guardado en la base de datos nunca cambia, esto
// solo controla CÓMO se muestra y CÓMO se interpreta lo que el usuario
// teclea en los campos de monto.
export const MONEDAS = {
  COP: {
    codigo: 'COP',
    locale: 'es-CO',
    simbolo: '$',
    posicionSimbolo: 'antes',
    decimales: 0,
    separadorMiles: '.',
    separadorDecimal: ',',
    etiqueta: 'Peso colombiano (COP)',
  },
  USD: {
    codigo: 'USD',
    locale: 'en-US',
    // Se usa "US$" (no el "$" por defecto de Intl para en-US) a propósito,
    // para que nunca se confunda con el "$" de COP.
    simbolo: 'US$',
    posicionSimbolo: 'antes',
    decimales: 2,
    separadorMiles: ',',
    separadorDecimal: '.',
    etiqueta: 'Dólar estadounidense (USD)',
  },
  EUR: {
    codigo: 'EUR',
    locale: 'de-DE',
    simbolo: '€',
    posicionSimbolo: 'despues',
    decimales: 2,
    separadorMiles: '.',
    separadorDecimal: ',',
    etiqueta: 'Euro (EUR)',
  },
}

export const MONEDA_POR_DEFECTO = 'COP'

export function configMoneda(moneda) {
  return MONEDAS[moneda] ?? MONEDAS[MONEDA_POR_DEFECTO]
}
