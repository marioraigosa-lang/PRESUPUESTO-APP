import { textoFechas } from '../TarjetaViaje'

// Arma los chips del mini-resumen que los pasos 2, 3 y 4 muestran arriba
// ("Bogotá → Cartagena · 12 mar - 20 mar · 2 adultos"). Función PURA, mismo
// espíritu que los otros dos asistentes: decide solo QUÉ mostrar y a qué
// paso saltaría cada chip -- ResumenBorradorViaje.jsx decide si es tocable.
//
// Como flujosViaje() nunca salta pasos (ver ese archivo), para cuando se
// llega a 'fechas' el paso 'origenDestino' ya se resolvió (con o sin datos)
// -- no hace falta mirar `pasos` para saber qué chips YA se pueden armar,
// solo si el campo tiene algo que mostrar.
//
// Reutiliza textoFechas() de TarjetaViaje.jsx (la misma función que pinta el
// rango de fechas en la tarjeta de la lista de viajes) en vez de reimplementar
// el formato de fechas -- espera un objeto con fecha_desde/fecha_hasta, de
// ahí el pequeño adaptador acá.
export function chipsResumenViaje(borrador, { idioma, t, tp }) {
  const chips = []

  if (borrador.origen || borrador.destino) {
    const texto =
      borrador.origen && borrador.destino
        ? `${borrador.origen} → ${borrador.destino}`
        : borrador.origen || borrador.destino
    chips.push({ paso: 'origenDestino', texto })
  }

  if (borrador.fechaDesde || borrador.fechaHasta) {
    chips.push({
      paso: 'fechas',
      texto: textoFechas({ fecha_desde: borrador.fechaDesde, fecha_hasta: borrador.fechaHasta }, idioma, t),
    })
  }

  // Solo se muestra si algo cambió del valor por defecto (1 adulto, 0
  // niños) -- mostrarlo siempre sería ruido, ya que ese valor por defecto
  // aplica a la gran mayoría de los viajes sin que el usuario haya "elegido"
  // nada todavía.
  const adultos = Number(borrador.adultos) || 0
  const ninos = Number(borrador.ninos) || 0
  if (adultos !== 1 || ninos !== 0) {
    const texto =
      ninos > 0
        ? `${tp('viajes.adultosContador', adultos)} · ${tp('viajes.ninosContador', ninos)}`
        : tp('viajes.adultosContador', adultos)
    chips.push({ paso: 'personas', texto })
  }

  return chips
}
