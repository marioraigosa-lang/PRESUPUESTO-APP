// Copy de la landing -- reutiliza tal cual el mensaje ya validado en
// FICHA-PLAYSTORE.md (propósito, beneficios, privacidad) para que la ficha
// de Play Store y la landing cuenten la misma historia con las mismas
// palabras.

export const HERO = {
  subtitulo: 'Tranquilidad financiera, a tu ritmo',
  gancho:
    'Consolida finanzas sanas que te permitan tomar decisiones a consciencia, no por la presión de unas finanzas poco organizadas.',
}

// parrafo: arreglo de segmentos en vez de un solo string -- un string es
// texto normal, { destacado: '...' } se pinta en mint (Landing.jsx hace el
// map). Evita meter un parser de markdown para resaltar 4 palabras.
export const PROPOSITO = {
  parrafo: [
    'Hay una calma distinta cuando dejas de sentir presión por tus finanzas y empiezas a tomar decisiones ',
    { destacado: 'a consciencia' },
    '. Esa es la razón de ser de Seed: ayudarte a consolidar ',
    { destacado: 'finanzas sanas' },
    ', no a través de reglas rígidas, sino dándote las herramientas para ver ',
    { destacado: 'con claridad' },
    ' en qué se va tu dinero — y decidir tú, ',
    { destacado: 'con calma' },
    ', hacia dónde quieres que vaya.',
  ],
}

// icono: nombre del componente de lucide-react (Landing.jsx los importa).
// detalle: 2-3 frases que solo se ven al expandir la tarjeta (acordeón) --
// amplía la descripción corta con la misma base de FICHA-PLAYSTORE.md, sin
// mencionar ninguna función que la app no tenga.
export const BENEFICIOS = [
  {
    icono: 'Zap',
    titulo: 'Registra en segundos',
    descripcion:
      'Un asistente paso a paso te pregunta lo justo y necesario. Nada de formularios largos: entras, registras, sigues con tu día.',
    detalle:
      'Cada ingreso, gasto o retiro se registra en segundos: el asistente te guía con preguntas simples, sin listas interminables de campos por llenar. Así, llevar el control de tu dinero deja de sentirse como una tarea pendiente y se vuelve parte natural de tu día.',
  },
  {
    icono: 'CreditCard',
    titulo: 'Cuentas y tarjetas de crédito',
    descripcion:
      'Cupo disponible, deuda y pagos, junto a tus cuentas — una vista real y completa de tu situación financiera, no una parcial.',
    detalle:
      'Seed no se queda solo en el efectivo: además de tus cuentas, maneja tus tarjetas de crédito con su cupo disponible, la deuda actual y tus pagos. Todo junto, en un solo lugar, para que veas tu situación financiera completa — no fragmentos sueltos que hay que sumar mentalmente.',
  },
  {
    icono: 'PieChart',
    titulo: 'Presupuestos a tu medida',
    descripcion:
      'Separa lo fijo (arriendo, servicios, suscripciones) de lo variable, para saber exactamente cuánto margen de maniobra tienes.',
    detalle:
      'Organiza tus gastos por categorías y distingue lo que se repite cada mes (arriendo, servicios, suscripciones) de lo que cambia. Con esa claridad sabes, de un vistazo, cuánto margen real tienes para decidir — sin sorpresas a fin de mes.',
  },
  {
    icono: 'PiggyBank',
    titulo: 'Metas y fondo de emergencia',
    descripcion:
      'Define metas de ahorro concretas y construye tu fondo de emergencia con mensajes que te motivan a seguir cuando ya llevas terreno recorrido.',
    detalle:
      'Define metas de ahorro concretas — una cuota inicial, un viaje, lo que sea importante para ti — y construye tu fondo de emergencia con una meta realista en meses de gastos. Seed te acompaña con mensajes que celebran el terreno recorrido, para que ahorrar se sienta como progreso, no como sacrificio.',
  },
  {
    icono: 'Plane',
    titulo: 'Viajes, sin sustos al volver',
    descripcion:
      'Planea el presupuesto antes de salir y registra los gastos durante el viaje, para disfrutar sin ansiedad al revisar el extracto.',
    detalle:
      'Antes de salir, define cuánto quieres gastar en tu viaje; durante el recorrido, registra cada gasto sin esfuerzo. Así disfrutas el momento sin esa ansiedad de "¿cuánto llevo gastado?" — y vuelves a casa sin sustos al revisar el extracto.',
  },
]

// Galería de capturas reales (Landing.jsx, dentro de MarcoTelefono.jsx).
// captura: clave que Landing.jsx mapea a la imagen importada (ver
// src/landing/capturas/). titulo dobla como alt de la imagen -- describe
// qué muestra la pantalla, no repite "captura de pantalla de".
export const GALERIA = [
  {
    captura: 'resumen',
    titulo: 'Un resumen claro de tus finanzas',
  },
  {
    captura: 'registros',
    titulo: 'Registra tus movimientos en segundos',
  },
  {
    captura: 'fondo',
    titulo: 'Tu fondo de emergencia, siempre a la vista',
  },
]

export const PRIVACIDAD = {
  titulo: 'No conectamos tu banco. Tus datos son tuyos.',
  parrafo:
    'Seed no se conecta a tu banco ni le pide tus credenciales bancarias. Tú decides qué registrar, y esos datos son tuyos: no se comparten ni se usan para venderte nada. La privacidad no es un extra, es parte de cómo está construida la app desde el principio.',
}

export const CIERRE = {
  titulo: 'Empieza tu camino hacia la tranquilidad financiera',
  parrafo:
    'No necesitas tener todo resuelto para empezar, solo necesitas empezar a ver con claridad.',
}

// Cuando la ficha de Play Store quede publicada: cambiar a true. Un solo
// cambio de línea -- el badge de Android en el hero (Landing.jsx) es un
// botón estilizado propio (icono + texto), no una imagen del badge oficial
// de Google, así que no depende de ningún asset en public/ ni de
// hotlinkear la imagen de Google (bloqueado por el img-src del CSP, ver
// vercel.json).
export const PLAY_STORE_PUBLICADO = false
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.seedfinanzas.app'

export const CONTACTO_EMAIL = 'seed.fin.app@gmail.com'

// URL canónica que se comparte desde el botón "Compartir Seed" (ver
// Landing.jsx). Separada de PLAY_STORE_URL: mientras la ficha de Play Store
// no esté publicada, lo que tiene sentido difundir es la landing.
export const URL_SEED = 'https://www.seedfinanzas.com'

// Botón de compartir, en el hero: texto del botón + el título/texto que se
// pasan a navigator.share (Web Share API) cuando el dispositivo la soporta
// -- ver manejarCompartir en Landing.jsx.
export const COMPARTIR = {
  boton: 'Compartir Seed',
  tituloCompartir: 'Seed: Finanzas personales',
  textoCompartir: 'Te comparto Seed, una app para organizar tus finanzas con tranquilidad 🌱',
  enlaceCopiado: 'Enlace copiado',
}

// Badges de tienda, compactos, en el hero, debajo de los CTAs principales
// (Empezar gratis / Ya tengo cuenta), nunca compitiendo con ellos.
// android.disponible se usa cuando PLAY_STORE_PUBLICADO ya es true;
// android.proximamente y ios.proximamente son el estado actual de ambas
// tiendas (Google Play sin fecha todavía; App Store, sin desarrollo iOS
// nativo). tituloInstalar/instruccionInstalar son el único detalle que no
// cabe en un badge compacto, se muestran en un <details> nativo, oculto
// hasta que alguien lo busca. tituloInstalar es una afirmación con
// confianza ("Instálalo..."), no una pregunta -- así invita a la acción en
// vez de sonar dudoso.
export const DESCARGA = {
  android: {
    disponible: 'Disponible en Google Play',
    proximamente: 'Muy pronto en Google Play',
  },
  ios: {
    proximamente: 'Muy pronto en App Store',
    tituloInstalar: 'Instálalo en iPhone',
    instruccionInstalar: 'En Safari, toca Compartir → Agregar a pantalla de inicio.',
  },
}
