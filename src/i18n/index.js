import es from './es'
import en from './en'

// Un diccionario por idioma soportado. Agregar un idioma nuevo en el futuro
// es: crear su archivo (ej. src/i18n/fr.js) y sumarlo acá.
const DICCIONARIOS = { es, en }

// Busca una clave con notación de puntos ('perfil.titulo') dentro de un
// diccionario anidado. Devuelve undefined si no la encuentra, para que
// `traducir` decida el respaldo.
function buscar(diccionario, clave) {
  return clave.split('.').reduce((actual, parte) => actual?.[parte], diccionario)
}

// Reemplaza placeholders '{{nombre}}' dentro de un texto ya traducido con
// los valores de `valores`. Si el texto no es un string (ej. un array como
// comun.meses) o no se pasaron valores, lo devuelve tal cual -- así
// `interpolar` es un no-op para todos los usos de `t('clave')` que ya
// existían antes de esto (Fase 1), sin tener que tocarlos.
function interpolar(texto, valores) {
  if (typeof texto !== 'string' || !valores) return texto
  return texto.replace(/\{\{(\w+)\}\}/g, (coincidencia, nombre) =>
    valores[nombre] !== undefined ? String(valores[nombre]) : coincidencia,
  )
}

// Traduce `clave` al `idioma` pedido. Si la clave no existe en ese idioma
// (por ejemplo, una pantalla que todavía no se ha traducido en fases
// futuras), cae a español -- el idioma con el que arrancó la app y el
// único garantizado a estar completo. Si tampoco existe en español (clave
// mal escrita), devuelve la clave tal cual: nunca revienta la pantalla.
//
// `valores`, si se pasa, inserta datos dentro del texto encontrado (ej.
// t('home.pagadoPorcentaje', { porcentaje: 70 }) -> 'Pagado 70%'). Cada
// idioma controla en qué orden aparecen los placeholders en su propia
// traducción, así que interpolar nunca rompe la gramática de ninguno.
export function traducir(idioma, clave, valores) {
  const texto = buscar(DICCIONARIOS[idioma], clave) ?? buscar(DICCIONARIOS.es, clave) ?? clave
  return interpolar(texto, valores)
}

// Traduce una clave con formas singular/plural: `claveBase.uno` para
// cantidad === 1, `claveBase.otro` para cualquier otra cantidad (0, 2, 3...).
// Necesaria porque algo como "mes(es)" no se puede resolver con una sola
// clave de texto fijo sin sonar mal en alguno de los dos idiomas ("1 meses"
// en español, o un plural incorrecto en inglés). Inyecta la cantidad como
// {{count}} además de cualquier otro valor en `valores`.
export function traducirPlural(idioma, claveBase, cantidad, valores) {
  const clave = `${claveBase}.${cantidad === 1 ? 'uno' : 'otro'}`
  return traducir(idioma, clave, { count: cantidad, ...valores })
}
