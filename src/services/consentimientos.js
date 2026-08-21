// Servicio de consentimientos: la contraparte de PantallaConsentimiento.jsx
// (el gate) a lo que options.data del signUp ya hace en Registro.jsx para
// cuentas nuevas. Acá el usuario YA tiene sesión (a diferencia del registro,
// que pasa por el trigger handle_new_user), así que la fila se inserta
// directo desde el cliente vía datosUsuario.insertarPropio -- la tabla
// "consentimientos" tiene política de INSERT para "authenticated" (ver
// sql/supabase_consentimientos.sql) justamente para este caso.
//
// `datosUsuario` es el objeto { seleccionarPropio, insertarPropio, ... } que
// useDatosUsuario() devuelve -- mismo criterio que services/cuentas.js: la
// función no llama al hook, recibe el resultado ya armado.
import VERSIONES_LEGALES from '../constants/versionesLegales'

export async function registrarConsentimientoVigente(datosUsuario) {
  const { error } = await datosUsuario.insertarPropio('consentimientos', [
    { tipo: 'politica_datos', version: VERSIONES_LEGALES.POLITICA_DATOS },
    { tipo: 'terminos_uso', version: VERSIONES_LEGALES.TERMINOS },
    { tipo: 'mayor_edad', version: VERSIONES_LEGALES.MAYOR_EDAD },
  ])

  if (error) throw new Error(error.message)
}
