// Versión vigente de cada documento/consentimiento legal. Es la fuente única
// de verdad: tanto las pantallas de lectura (PoliticaDatos.jsx,
// TerminosCondiciones.jsx) como, más adelante, el registro y el gate de
// consentimiento (que guardarán qué versión aceptó cada usuario) deben leer
// estos valores en vez de repetir el número sueltos por el código.
//
// Al publicar cambios sustanciales en un documento, sube su versión acá --
// eso es lo que permitirá detectar, en el futuro, que un usuario aceptó una
// versión vieja y necesita volver a aceptar.
const VERSIONES_LEGALES = {
  POLITICA_DATOS: '1.0',
  TERMINOS: '1.0',
  MAYOR_EDAD: '1.0',
}

export default VERSIONES_LEGALES
