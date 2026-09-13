// Reducer PURO del asistente paso a paso. El "borrador" que gestiona es la
// misma forma que espera construirDatosMovimiento (más el estado propio de
// navegación del asistente: indicePaso y las preselecciones). No conoce
// flujos.js ni React -- AsistenteMovimiento.jsx es quien combina este estado
// con flujos() para saber en qué paso está parado.

export function estadoInicialAsistente({
  cuentaPreseleccionadaId,
  categoriaPreseleccionadaId,
  cuentaAutoAsignadaId,
} = {}) {
  // Una categoría preseleccionada solo tiene sentido para un gasto (las
  // categorías no aplican a ingreso/traslado/retiro, ver
  // construirDatosMovimiento.js) -- así que entrar con una categoría ya
  // decidida (ej. "+ Nuevo gasto" desde DetalleCategoria.jsx) también fija
  // el tipo, y con eso el paso 'tipo' se salta igual que el de categoría
  // (ver tipoPreseleccionado en flujos.js). Cuando esto pasa, ELEGIR_TIPO
  // nunca se despacha (el tipo ya nace fijo) -- así que la única
  // oportunidad de aplicar `cuentaAutoAsignadaId` (ver opcionUnica en
  // flujos.js) es acá mismo, además de en ELEGIR_TIPO para el resto de los
  // casos (ver AsistenteMovimiento.jsx -> elegirTipo).
  const tipoPreseleccionado = Boolean(categoriaPreseleccionadaId)

  return {
    tipo: tipoPreseleccionado ? 'gasto' : '',
    tipoPreseleccionado,
    origen: 'cuenta',
    cuentaId: cuentaPreseleccionadaId || cuentaAutoAsignadaId || '',
    cuentaDestinoId: '',
    tarjetaId: '',
    categoriaId: categoriaPreseleccionadaId ?? '',
    monto: '',
    descripcion: '',
    indicePaso: 0,
    // Se guardan tal cual en el borrador (en vez de leerse aparte) para que
    // flujos.js -- que solo recibe el borrador y el contexto -- pueda decidir
    // qué pasos saltar sin necesitar un tercer parámetro.
    cuentaPreseleccionadaId: cuentaPreseleccionadaId ?? '',
    categoriaPreseleccionadaId: categoriaPreseleccionadaId ?? '',
  }
}

export function reductorAsistente(estado, accion) {
  switch (accion.tipo) {
    // Elegir el tipo de movimiento reinicia todo lo que no aplica a un tipo
    // nuevo (ej. pasar de "gasto con tarjeta" a "ingreso" no debe dejar
    // tarjetaId pegado) pero conserva las preselecciones, que vienen de
    // afuera y no dependen del tipo. `sugerencias` (opcional) trae la
    // "última cuenta/categoría usada" que AsistenteMovimiento.jsx leyó de
    // localStorage (ver ultimoUsado.js) -- este reducer se queda puro, solo
    // decide la PRIORIDAD: una preselección explícita (props) siempre gana
    // sobre una sugerencia por historial.
    case 'ELEGIR_TIPO':
      return {
        ...estado,
        tipo: accion.valor,
        origen: 'cuenta',
        cuentaId: estado.cuentaPreseleccionadaId || accion.sugerencias?.cuentaId || '',
        cuentaDestinoId: '',
        tarjetaId: '',
        categoriaId: estado.categoriaPreseleccionadaId || accion.sugerencias?.categoriaId || '',
        monto: '',
        descripcion: '',
        indicePaso: 1,
      }

    // Fusiona los campos que el paso actual acaba de resolver y avanza uno.
    // El nuevo indicePaso siempre cae dentro de flujos(borrador-actualizado):
    // los pasos ANTERIORES al actual nunca cambian por una respuesta nueva
    // (las reglas de salto solo dependen de cuentas/preselecciones, que son
    // fijas durante una sesión del asistente).
    case 'PARCHAR':
      return {
        ...estado,
        ...accion.cambios,
        indicePaso: estado.indicePaso + 1,
      }

    // Como PARCHAR, fusiona campos, pero SIN avanzar de paso -- para un
    // campo que se va tecleando (el concepto) en vez de elegirse de una
    // lista. Sin esto, el texto solo vivía en el estado local de
    // PasoConcepto.jsx y se perdía cada vez que ese paso se desmontaba (al
    // volver atrás, o al saltar a otro paso desde el mini-resumen).
    case 'ACTUALIZAR':
      return {
        ...estado,
        ...accion.cambios,
      }

    case 'RETROCEDER':
      return {
        ...estado,
        indicePaso: Math.max(estado.indicePaso - 1, 0),
      }

    case 'IR_A_PASO':
      return {
        ...estado,
        indicePaso: Math.max(accion.indice, 0),
      }

    case 'REINICIAR':
      return estadoInicialAsistente(accion.preselecciones)

    default:
      return estado
  }
}
