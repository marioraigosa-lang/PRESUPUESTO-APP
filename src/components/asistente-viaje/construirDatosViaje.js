// Arma el objeto `datos` que espera services/viajes.js -> agregarViaje a
// partir del borrador del asistente. Función PURA: sin React, sin estado.
//
// `nombre` es obligatorio en la base (columna "not null", ver
// sql/supabase_viajes.sql) pero el asistente no lo pregunta directamente --
// el paso 1 es "¿de dónde a dónde?" (ver pasos/PasoOrigenDestino.jsx), no
// "¿cómo se llama tu viaje?". Se deriva del destino ("Viaje a Cartagena"),
// del origen si no hay destino, o de un texto genérico si el usuario dejó
// los dos vacíos -- el nombre siempre se puede cambiar después editando el
// viaje (HojaNuevoViaje.jsx, que sí pide nombre explícito).
export function construirDatosViaje(borrador, { t }) {
  const origen = borrador.origen.trim()
  const destino = borrador.destino.trim()

  const nombre = destino
    ? t('viajes.asistente.nombrePorDefecto', { destino })
    : origen
      ? t('viajes.asistente.nombrePorDefectoOrigen', { origen })
      : t('viajes.asistente.nombrePorDefectoGenerico')

  return {
    nombre,
    adultos: Number(borrador.adultos) || 1,
    ninos: Number(borrador.ninos) || 0,
    fechaDesde: borrador.fechaDesde || null,
    fechaHasta: borrador.fechaHasta || null,
    origen,
    destino,
  }
}

// Arma la lista que espera services/categoriasViaje.js -> crearCategoriasElegidas
// a partir de borrador.categorias (ver reductorViaje.js): SOLO las marcadas,
// cada una con su presupuesto (0 si quedó vacío) y la moneda compartida del
// paso 4.
export function categoriasElegidasDeViaje(borrador) {
  return Object.entries(borrador.categorias)
    .filter(([, datos]) => datos.seleccionada)
    .map(([clave, datos]) => ({
      clave,
      presupuesto: Number(datos.presupuesto) || 0,
      moneda: borrador.monedaCategorias,
    }))
}
