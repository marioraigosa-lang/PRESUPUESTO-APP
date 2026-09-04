// Servicio de "Reiniciar datos" (Fase 6 del plan de saldo calculado, ver
// sql/supabase_reiniciar_datos.sql): a diferencia del resto de services/*.js,
// no usa `datosUsuario.eliminarPropio(...)` porque el borrado no es un DELETE
// simple sobre una tabla -- es una función RPC en la base de datos que borra
// movimientos y, según la opción elegida, gastos fijos, en una sola
// transacción. Se llama vía `supabase.rpc(...)` directo; `datosUsuario` solo
// se usa para confirmar que hay una sesión activa antes de llamar (mismo
// criterio que requerirUsuarioId en lib/datosUsuario.js).
import { supabase } from '../lib/supabase'

export async function reiniciarDatos(datosUsuario, { borrarGastosFijos = false } = {}) {
  if (!datosUsuario?.usuarioId) {
    throw new Error('No hay una sesión activa. Inicia sesión para continuar.')
  }

  const { error } = await supabase.rpc('reiniciar_datos_usuario', {
    borrar_gastos_fijos: borrarGastosFijos,
  })

  if (error) throw new Error(error.message || 'No se pudieron reiniciar los datos')
}
