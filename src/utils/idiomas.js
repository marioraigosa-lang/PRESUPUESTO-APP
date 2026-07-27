// Configuración de los 2 idiomas soportados por la app. Mismo patrón que
// src/utils/monedas.js: un objeto por código con sus metadatos, y una
// constante con el idioma por defecto para cuando todavía no se sabe el del
// usuario (antes de iniciar sesión, o mientras se carga su perfil).
export const IDIOMAS = {
  es: {
    codigo: 'es',
    etiqueta: 'ES',
    nombre: 'Español',
  },
  en: {
    codigo: 'en',
    etiqueta: 'EN',
    nombre: 'English',
  },
}

export const IDIOMA_POR_DEFECTO = 'es'
