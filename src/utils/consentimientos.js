// Validación pura del gate de consentimiento del registro (Ley 1581 de
// 2012): Registro.jsx y PantallaConsentimiento.jsx la usan tanto para
// deshabilitar su botón de continuar como para el chequeo defensivo dentro
// del envío. Separada de esas pantallas para poder probarla sin montar el
// componente (no hay React Testing Library en este proyecto -- ver
// fortalezaContrasena.js para el mismo criterio con otra validación de
// Registro.jsx).
export function todosLosConsentimientosAceptados({ aceptoDatos, aceptoTerminos, mayorEdad }) {
  return Boolean(aceptoDatos && aceptoTerminos && mayorEdad)
}

// A qué clave de VERSIONES_LEGALES (src/constants/versionesLegales.js)
// corresponde cada `tipo` de fila de la tabla "consentimientos".
const CLAVE_VERSION_POR_TIPO = {
  politica_datos: 'POLITICA_DATOS',
  terminos_uso: 'TERMINOS',
  mayor_edad: 'MAYOR_EDAD',
}

// El gate de consentimiento (AuthContext.jsx) usa esto para decidir si un
// usuario autenticado puede entrar a la app o necesita ver
// PantallaConsentimiento.jsx primero. `filas` son las filas de la tabla
// "consentimientos" del usuario (cada una { tipo, version }, tal como las
// devuelve Supabase); `versionesVigentes` es VERSIONES_LEGALES.
//
// "Vigente" significa: para CADA uno de los 3 tipos exigidos, existe AL
// MENOS UNA fila cuya versión coincide exactamente con la vigente -- no
// alcanza con haber aceptado una versión anterior (la tabla es historial
// append-only, así que puede haber varias filas del mismo tipo con
// versiones distintas; solo importa si la vigente está entre ellas). Un
// usuario sin ninguna fila (nunca aceptó nada, ej. cuentas creadas antes de
// que existieran los checkboxes) tampoco está vigente.
export function tieneConsentimientoVigente(filas = [], versionesVigentes) {
  return Object.entries(CLAVE_VERSION_POR_TIPO).every(([tipo, clave]) =>
    filas.some((fila) => fila.tipo === tipo && fila.version === versionesVigentes[clave]),
  )
}
