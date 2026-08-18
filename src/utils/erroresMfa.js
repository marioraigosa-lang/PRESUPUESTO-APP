// Igual que erroresAuth.js, pero para los errores de supabase.auth.mfa.* --
// son mensajes distintos a los de signInWithPassword (siempre en inglés,
// sin importar el idioma activo), así que necesitan su propio mapeo.
const traducciones = [
  { patron: /invalid.*(code|totp)/i, clave: 'seguridad.errorCodigoInvalido' },
  { patron: /aal2/i, clave: 'seguridad.errorRequiereAal2' },
  { patron: /rate limit/i, clave: 'seguridad.errorLimiteIntentos' },
  { patron: /already.*(enrolled|exists)|friendly name/i, clave: 'seguridad.errorFactorDuplicado' },
  { patron: /auth session missing|session.*expired|jwt expired/i, clave: 'auth.errorSesionExpirada' },
]

export function traducirErrorMfa(mensaje) {
  const encontrada = traducciones.find(({ patron }) => patron.test(mensaje ?? ''))
  return encontrada ? encontrada.clave : 'seguridad.errorGenerico'
}
