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
  // Cooldown de reenvío de correo (registro con un correo que ya se registró
  // pero todavía no confirmó, o el botón "Reenviar correo" de la pantalla de
  // confirmación): Supabase no deja reenviar el mismo correo antes de que
  // pase el cooldown y devuelve este mensaje -- NO contiene "rate limit", así
  // que sin este patrón caía en el genérico y parecía que el registro había
  // fallado cuando en realidad ya se había creado la cuenta y ya se había
  // enviado el correo (ver caso real: usuario que tocó "Crear cuenta" dos
  // veces). Se traduce a un mensaje tranquilizador, no a un error.
  { patron: /you can only request this after \d+ seconds/i, clave: 'auth.errorCorreoYaEnviado' },
  { patron: /rate limit/i, clave: 'auth.errorLimiteIntentos' },
  { patron: /auth session missing|session.*expired|jwt expired/i, clave: 'auth.errorSesionExpirada' },
]

export function traducirErrorAuth(mensaje) {
  const encontrada = traducciones.find(({ patron }) => patron.test(mensaje ?? ''))
  return encontrada ? encontrada.clave : 'auth.errorGenerico'
}
