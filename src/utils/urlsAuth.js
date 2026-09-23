// Construye la URL a la que Supabase debe devolver al usuario después de
// hacer clic en el enlace de "restablecer contraseña" que recibe por correo
// (ver RecuperarContrasena.jsx, supabase.auth.resetPasswordForEmail).
//
// Se arma a partir de window.location.origin, así que en desarrollo apunta
// sola a http://localhost:5173 (o el puerto que use Vite) y en producción
// apuntará sola a la URL real donde quede desplegada la app -- no hay que
// tocar nada a mano al pasar de un ambiente a otro. Eso sí: la URL de
// redirección tiene que estar en la lista blanca de "Redirect URLs" del
// proyecto de Supabase (Authentication > URL Configuration) para que
// funcione en cada ambiente.
//
// El parámetro "?tipo=restablecer-contrasena" no lo usa Supabase para nada:
// es una marca propia que AuthContext.jsx revisa al cargar la app para
// saber que, si el regreso trae un error en el hash (#error=...), ese error
// pertenece a ESTE flujo de recuperación y no a otro enlace de confirmación
// de Supabase que también use el mismo mecanismo.
export function urlRestablecerContrasena() {
  return `${window.location.origin}${window.location.pathname}?tipo=restablecer-contrasena`
}

// Mismo patrón exacto que urlRestablecerContrasena() de arriba, para el
// enlace de confirmación de correo del registro (ver Registro.jsx,
// options.emailRedirectTo del signUp). window.location.origin hace que
// apunte solo al dominio real donde esté desplegada la app (nunca a una URL
// vieja de Vercel u otro ambiente hardcodeada) sin tener que tocar nada al
// cambiar de ambiente. El parámetro "?tipo=cuenta-confirmada" tampoco lo usa
// Supabase: es la marca propia que AuthContext.jsx lee para saber que este
// regreso es de confirmación de cuenta y no de cualquier otro enlace de
// Supabase que también use este mismo mecanismo (recuperación de
// contraseña, magic link, etc.).
//
// Importante: esta URL debe estar en la lista blanca de "Redirect URLs" del
// proyecto de Supabase (Authentication > URL Configuration) para que
// Supabase la acepte -- si no está en la lista, cae de vuelta al "Site URL"
// configurado ahí.
export function urlConfirmacionCuenta() {
  return `${window.location.origin}${window.location.pathname}?tipo=cuenta-confirmada`
}
