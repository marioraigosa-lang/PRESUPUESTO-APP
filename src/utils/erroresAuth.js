// Los patrones detectan el mensaje de error que devuelve la API de Supabase
// (siempre en inglés, sin importar el idioma activo de la app) y deciden
// CUÁL clave de traducción corresponde -- no arman el texto final. Mismo
// patrón que mensajeFondo.js: este util no es un componente y no tiene
// acceso al idioma activo, así que quien llama (Login.jsx/Registro.jsx)
// decide el idioma con t(clave).
const traducciones = [
  { patron: /invalid login credentials/i, clave: 'auth.errorCredenciales' },
  { patron: /email not confirmed/i, clave: 'auth.errorEmailNoConfirmado' },
  { patron: /user already registered|already been registered/i, clave: 'auth.errorYaRegistrado' },
  { patron: /password should be at least/i, clave: 'auth.errorPasswordCorta' },
  { patron: /unable to validate email address/i, clave: 'auth.errorEmailInvalido' },
  { patron: /rate limit/i, clave: 'auth.errorLimiteIntentos' },
]

export function traducirErrorAuth(mensaje) {
  const encontrada = traducciones.find(({ patron }) => patron.test(mensaje ?? ''))
  return encontrada ? encontrada.clave : 'auth.errorGenerico'
}
