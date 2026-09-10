// Arma los "chips" del mini-resumen que PasoMonto y PasoConcepto muestran
// arriba de la pantalla ("Gasto · 🍔 Comida · Nómina"). Función PURA: decide
// solo QUÉ mostrar y a qué nombre de paso saltaría cada chip si se toca --
// ResumenBorrador.jsx es quien decide si de verdad se puede tocar (un chip
// solo es tocable si ese paso sigue existiendo en `pasos`, ver flujos.js;
// si se saltó -- ej. una sola cuenta -- no hay nada que corregir).
const CLAVE_TIPO = {
  ingreso: 'movimientos.formulario.tipoIngreso',
  gasto: 'movimientos.formulario.tipoGasto',
  traslado: 'movimientos.formulario.tipoTraslado',
  retiro: 'movimientos.formulario.tipoRetiro',
}

export function chipsResumen(borrador, { cuentas = [], tarjetas = [], categorias = [], t, montoFormateado }) {
  const claveTipo = CLAVE_TIPO[borrador.tipo]
  if (!claveTipo) return []

  const chips = [{ paso: 'tipo', texto: t(claveTipo) }]

  if (borrador.tipo === 'gasto') {
    const categoria = categorias.find((categoria) => categoria.id === borrador.categoriaId)
    if (categoria) chips.push({ paso: 'categoria', texto: `${categoria.emoji} ${categoria.nombre}` })

    if (borrador.origen === 'tarjeta') {
      const tarjeta = tarjetas.find((tarjeta) => tarjeta.id === borrador.tarjetaId)
      if (tarjeta) chips.push({ paso: 'tarjeta', texto: tarjeta.nombre })
    } else {
      const cuenta = cuentas.find((cuenta) => cuenta.id === borrador.cuentaId)
      if (cuenta) chips.push({ paso: 'cuentaGasto', texto: cuenta.nombre })
    }
  } else if (borrador.tipo === 'traslado') {
    const origen = cuentas.find((cuenta) => cuenta.id === borrador.cuentaId)
    const destino = cuentas.find((cuenta) => cuenta.id === borrador.cuentaDestinoId)
    if (origen) chips.push({ paso: 'cuentaOrigen', texto: origen.nombre })
    if (destino) chips.push({ paso: 'cuentaDestino', texto: destino.nombre })
  } else {
    // ingreso / retiro
    const cuenta = cuentas.find((cuenta) => cuenta.id === borrador.cuentaId)
    if (cuenta) chips.push({ paso: 'cuenta', texto: cuenta.nombre })
  }

  // Se arma acá (en vez de en ResumenBorrador.jsx) para que un solo chip de
  // monto ya formateado en la moneda activa quede en el mismo orden que el
  // resto -- el llamador decide si lo pasa (PasoConcepto sí, PasoMonto no,
  // porque ahí el monto es justamente lo que se está por decidir).
  if (montoFormateado) chips.push({ paso: 'monto', texto: montoFormateado })

  return chips
}
