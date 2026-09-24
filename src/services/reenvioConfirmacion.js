// Reenvío del correo de confirmación de cuenta. Se usa desde dos lugares:
// la pantalla "revisa tu correo" de Registro.jsx (botón "Reenviar correo") y
// la pantalla de enlace vencido de CuentaConfirmada.jsx. Está centralizado
// acá para que los dos reenvíos manden SIEMPRE emailRedirectTo: antes,
// Registro.jsx llamaba a supabase.auth.resend sin él, así que el enlace
// reenviado volvía al "Site URL" del Dashboard sin la marca
// "?tipo=cuenta-confirmada" (ver urlConfirmacionCuenta() en
// utils/urlsAuth.js) -- ni la pantalla de "¡Cuenta confirmada!" ni la de
// enlace vencido llegaban a mostrarse.
//
// Ojo: Supabase responde 200 sin error (y sin enviar nada) tanto si la
// cuenta YA está confirmada como si el correo no existe -- a propósito, para
// no revelar qué correos están registrados (ver internal/api/resend.go del
// repo supabase/auth). Quien llama no puede distinguir esos casos, así que
// el mensaje de éxito tiene que ser neutral.
import { supabase } from '../lib/supabase'
import { urlConfirmacionCuenta } from '../utils/urlsAuth'

export function reenviarConfirmacion(correo) {
  return supabase.auth.resend({
    type: 'signup',
    email: correo.trim(),
    options: { emailRedirectTo: urlConfirmacionCuenta() },
  })
}
