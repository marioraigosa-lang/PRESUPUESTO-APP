// Arma el objeto `datos` que espera services/movimientos.js a partir del
// estado de captura de un movimiento (el "borrador"). Función PURA: sin
// React, sin estado. Recibe `t` (la función de traducción del idioma
// activo) como parámetro del contexto para resolver los textos de
// respaldo, en vez de leerlo de un contexto de React -- así sigue siendo
// determinista según sus argumentos y la puede usar cualquiera.
//
// Se extrajo tal cual de HojaNuevoMovimiento.jsx -> manejarGuardar (Fase 0
// del asistente de movimiento paso a paso): la meta es que el formulario
// de edición y el wizard nuevo produzcan EXACTAMENTE el mismo objeto sin
// duplicar esta lógica.
//
// `borrador`:
//   - tipo: 'ingreso' | 'gasto' | 'traslado' | 'retiro' | 'pago_tarjeta'
//   - monto: string canónico ya normalizado por limpiarEntradaMonto
//     ("1000000", "1000.5") -- se pasa por Number() igual que hoy; el
//     formulario garantiza que sea > 0 antes de llamar aquí.
//   - origen: 'cuenta' | 'tarjeta' (solo relevante para un gasto)
//   - cuentaId, tarjetaId, cuentaDestinoId, categoriaId: ids seleccionados
//   - descripcion: texto del usuario (puede venir vacío o solo espacios)
//
// `contexto`:
//   - cuentas, categorias, tarjetas: listas actuales, para resolver
//     nombre/emoji (tarjetas solo se usa para el respaldo de "pago_tarjeta")
//   - t: función de traducción para los textos de respaldo
//
// Devuelve: { tipo, monto, cuentaId, tarjetaId, cuentaDestinoId,
//   categoriaId, emoji, descripcion } con los `null` que exige el
//   constraint movimientos_traslado_forma_check (ver
//   sql/supabase_tarjetas_movimientos.sql).
export function construirDatosMovimiento(borrador, contexto) {
  const {
    tipo,
    monto,
    origen = 'cuenta',
    cuentaId = '',
    tarjetaId = '',
    cuentaDestinoId = '',
    categoriaId = '',
    descripcion = '',
  } = borrador
  const { cuentas = [], categorias = [], tarjetas = [], t } = contexto

  // "Pagar tarjeta" (asistente): produce el objeto que espera
  // services/movimientos.js -> pagarTarjeta (cuenta_id Y tarjeta_id a la vez,
  // categoria_id null, emoji 💳 y la descripción de respaldo "Pago {tarjeta}"
  // -- las mismas que arma HojaPagoTarjeta.jsx). agregarMovimiento despacha a
  // pagarTarjeta al ver este tipo, así que los hints de saldo Y deuda salen
  // de esa función existente sin duplicar nada.
  if (tipo === 'pago_tarjeta') {
    const tarjetaSeleccionada = tarjetas.find((tarjeta) => tarjeta.id === tarjetaId)
    return {
      tipo: 'pago_tarjeta',
      monto: Number(monto),
      cuentaId,
      tarjetaId,
      cuentaDestinoId: null,
      categoriaId: null,
      emoji: '💳',
      descripcion:
        descripcion.trim() ||
        t('tarjetas.pago.descripcion', {
          tarjeta: tarjetaSeleccionada?.nombre ?? t('movimientos.formulario.cuentaGenerica'),
        }),
    }
  }

  // Solo un gasto puede salir de una tarjeta (ver constraint
  // movimientos_traslado_forma_check): ingreso/traslado/retiro siempre usan
  // cuenta, sin importar qué haya quedado en `origen` de una vez anterior.
  const usaTarjeta = tipo === 'gasto' && origen === 'tarjeta'

  const categoriaSeleccionada = categorias.find((categoria) => categoria.id === categoriaId)
  const cuentaOrigenSeleccionada = cuentas.find((cuenta) => cuenta.id === cuentaId)
  const cuentaDestinoSeleccionada = cuentas.find((cuenta) => cuenta.id === cuentaDestinoId)

  const emoji =
    tipo === 'ingreso'
      ? '💰'
      : tipo === 'traslado'
        ? '🔄'
        : tipo === 'retiro'
          ? '🏧'
          : (categoriaSeleccionada?.emoji ?? '✨')

  const descripcionFinal =
    descripcion.trim() ||
    (tipo === 'ingreso'
      ? t('movimientos.formulario.tipoIngreso')
      : tipo === 'traslado'
        ? `${cuentaOrigenSeleccionada?.nombre ?? t('movimientos.formulario.cuentaGenerica')} → ${
            cuentaDestinoSeleccionada?.nombre ?? t('movimientos.formulario.cuentaGenerica')
          }`
        : tipo === 'retiro'
          ? t('movimientos.formulario.tipoRetiro')
          : (categoriaSeleccionada?.nombre ?? t('movimientos.formulario.tipoGasto')))

  return {
    tipo,
    monto: Number(monto),
    cuentaId: usaTarjeta ? null : cuentaId,
    tarjetaId: usaTarjeta ? tarjetaId : null,
    cuentaDestinoId: tipo === 'traslado' ? cuentaDestinoId : null,
    // `&& categoriaId` a propósito, no solo `tipo === 'gasto'`: un gasto SIN
    // categoría (el usuario no tiene ninguna propia, ver PasoCategoria.jsx)
    // debe guardar categoria_id NULL, nunca '' -- categoria_id es una
    // columna uuid (ver sql/supabase_setup.sql), y '' no es un uuid válido.
    // La base ya admite un gasto sin categoría (categoria_id es nullable y
    // el constraint de "forma" no la exige, ver
    // sql/supabase_tarjetas_movimientos.sql).
    categoriaId: tipo === 'gasto' && categoriaId ? categoriaId : null,
    emoji,
    descripcion: descripcionFinal,
  }
}
