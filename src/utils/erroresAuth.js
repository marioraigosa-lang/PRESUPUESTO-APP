const traducciones = [
  { patron: /invalid login credentials/i, mensaje: 'Correo o contraseña incorrectos' },
  {
    patron: /email not confirmed/i,
    mensaje: 'Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.',
  },
  {
    patron: /user already registered|already been registered/i,
    mensaje: 'Este correo ya está registrado. Intenta iniciar sesión.',
  },
  {
    patron: /password should be at least/i,
    mensaje: 'La contraseña debe tener al menos 6 caracteres',
  },
  {
    patron: /unable to validate email address/i,
    mensaje: 'El correo no tiene un formato válido',
  },
  {
    patron: /rate limit/i,
    mensaje: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
  },
]

export function traducirErrorAuth(mensaje) {
  const encontrada = traducciones.find(({ patron }) => patron.test(mensaje ?? ''))
  return encontrada ? encontrada.mensaje : 'Ocurrió un error. Inténtalo de nuevo.'
}
