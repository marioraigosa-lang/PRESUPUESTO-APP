// Devuelve la CLAVE de traducción del mensaje según el estado del fondo (no
// el texto ya armado) más los VALORES a interpolar en ella -- mismo patrón
// que generarRecomendacionMeta (proyeccionMeta.js): el componente que llama
// a esto arma la frase final con t(clave, valores), sin que este util (que
// no es un componente y no tiene acceso al idioma activo) tenga que
// preocuparse por eso.
//
// Siempre interpola el número REAL de meses cubiertos -- nunca un mensaje
// genérico -- para que se sienta como lo diría un coach financiero cercano
// mirando tus números, no un texto de relleno. Cuatro tramos, en este
// orden de prioridad:
//
//   1. Menos de 1 mes cubierto: alerta urgente. Es la prioridad financiera
//      número uno sin importar qué meta se haya elegido -- ni siquiera una
//      meta baja (ej. 1 mes) alcanza a "perdonar" este tramo.
//   2. Por debajo de la meta propia (1 mes o más): mensaje de aliento,
//      siempre mencionando la meta para dar contexto de cuánto falta.
//   3. Meta alcanzada o superada, pero todavía por debajo de 12 meses:
//      felicitación por el logro concreto de ESA meta.
//   4. 12 meses o más cubiertos: la felicitación más fuerte -- 12 meses es
//      el umbral que solemos asociar con "finanzas sanas" más allá de
//      cualquier meta personal, así que pisa el tramo 2 aunque la meta
//      elegida sea mayor a 12 (ver nota de orden más abajo).
//
// Nota de orden: si `metaMeses` es mayor a 12 (el rango ahora llega hasta
// 60, ver LIMITE_MESES_META en Emergencia.jsx) y el usuario todavía no la
// alcanzó, gana el tramo 2 aunque ya tenga 12+ meses cubiertos -- se
// interpreta como "todavía construyendo HACIA TU propia meta", no como
// "ya llegaste". Es una decisión de producto, no un descuido: si se
// prefiriera que 12+ meses gane siempre sin importar la meta, alcanza con
// mover el chequeo de "mesesCubiertos < 12" antes que el de "< metaMeses".
export function mensajeFondo(mesesCubiertos, metaMeses) {
  if (mesesCubiertos < 1) {
    return {
      clave: 'emergencia.mensajeConstruyendoUrgente',
      tono: 'alerta',
      valores: { meses: mesesCubiertos },
    }
  }

  if (mesesCubiertos < metaMeses) {
    return {
      clave: 'emergencia.mensajeConstruyendo',
      tono: 'neutral',
      valores: { meses: mesesCubiertos, metaMeses },
    }
  }

  if (mesesCubiertos < 12) {
    return {
      clave: 'emergencia.mensajeMetaLograda',
      tono: 'positivo',
      valores: { meses: mesesCubiertos, metaMeses },
    }
  }

  return {
    clave: 'emergencia.mensajeFinanzasSanas',
    tono: 'positivo',
    valores: { meses: mesesCubiertos },
  }
}
