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
