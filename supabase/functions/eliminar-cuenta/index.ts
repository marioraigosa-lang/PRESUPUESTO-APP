// ============================================================================
// eliminar-cuenta (Edge Function)
//
// Borra PERMANENTEMENTE la cuenta del usuario autenticado que hace la
// petición, junto con TODOS sus datos (cuentas, movimientos, gastos fijos,
// categorías, fondo de emergencia, metas de ahorro, perfil, viajes,
// categorías/gastos de viaje y consentimientos) -- todas esas tablas tienen
// "on delete cascade" hacia auth.users(id) (ver sql/README.md), así que un
// solo auth.admin.deleteUser() en auth.users arrastra automáticamente las 11
// tablas sin que esta función tenga que borrarlas una por una.
//
// POR QUÉ HACE FALTA UNA EDGE FUNCTION (y no se puede desde el cliente):
//   auth.admin.deleteUser() solo existe en el Admin API de Supabase Auth, que
//   requiere la SERVICE_ROLE key -- una llave que NUNCA puede viajar al
//   navegador (se salta por completo RLS y cualquier otro permiso). Por eso
//   esta función corre del lado del servidor (Deno, en la infraestructura de
//   Supabase), con la service role guardada ahí, y el cliente (la app) solo
//   le manda su petición ya autenticada.
//
// GARANTÍA DE SEGURIDAD -- un usuario SOLO puede borrarse a sí mismo:
//   El id que se borra NUNCA sale del body de la petición (que cualquiera
//   podría manipular). Sale exclusivamente de auth.getUser(), que valida la
//   firma del JWT recibido en el header Authorization contra el propio
//   servidor de Supabase Auth y devuelve el usuario real dueño de ese token.
//   Si el token es inválido, ajeno o no viene, no hay usuario verificado y la
//   función corta en seco con 401 sin tocar auth.admin.deleteUser en ningún
//   momento.
//
// Variables de entorno usadas (inyectadas automáticamente por Supabase para
// TODA Edge Function del proyecto -- no se configuran a mano ni viven en
// ningún .env de este repo):
//   SUPABASE_URL              -- URL del proyecto.
//   SUPABASE_ANON_KEY         -- para el cliente "de verificación" (paso 1).
//   SUPABASE_SERVICE_ROLE_KEY -- para el cliente "de borrado" (paso 2), con
//                                 permisos de administrador.
// ============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2'

// Headers CORS estándar: sin esto, el navegador bloquea la respuesta antes
// de que el código de la app pueda leerla (invocación desde otro origen que
// el de la función). "Access-Control-Allow-Origin: *" es el mismo patrón que
// usan las plantillas oficiales de Supabase para Edge Functions invocadas
// desde un cliente con su propia autenticación (el control de acceso real no
// depende del origen, sino del JWT que se valida adentro).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function respuestaJson(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  // El navegador manda un preflight OPTIONS antes del POST real cuando hay
  // headers custom (Authorization) de por medio -- hay que responderlo con
  // los headers CORS y sin cuerpo, o el POST real nunca llega a salir.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return respuestaJson({ error: 'Método no permitido, se espera POST.' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      // No debería pasar nunca en un proyecto real de Supabase (las inyecta
      // automáticamente), pero si pasara, mejor fallar con un mensaje claro
      // que con un error críptico más abajo.
      console.error('Faltan variables de entorno de Supabase en la Edge Function.')
      return respuestaJson({ error: 'Configuración del servidor incompleta.' }, 500)
    }

    // ------------------------------------------------------------------
    // PASO 1: ¿quién es realmente el que llama? (verificación server-side)
    // ------------------------------------------------------------------
    // Cliente con la ANON key (nunca la service role acá), pasándole el
    // mismo header Authorization que mandó el usuario. auth.getUser() lo
    // valida contra Supabase Auth y devuelve al dueño real del token -- no
    // es una simple decodificación del JWT sin verificar.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return respuestaJson({ error: 'No autenticado.' }, 401)
    }

    const clienteVerificador = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: errorUsuario,
    } = await clienteVerificador.auth.getUser()

    if (errorUsuario || !user) {
      return respuestaJson({ error: 'No autenticado.' }, 401)
    }

    // ------------------------------------------------------------------
    // PASO 2: borrado real, con permisos de administrador
    // ------------------------------------------------------------------
    // Recién acá se usa la service role, y el id que se borra es SIEMPRE
    // user.id (el que acaba de verificar auth.getUser() arriba) -- nunca un
    // id que venga del body de la petición. auth: { persistSession: false }
    // porque este cliente vive solo durante esta única invocación, no tiene
    // sentido que intente guardar/leer sesión en ningún lado.
    const clienteAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error: errorBorrado } = await clienteAdmin.auth.admin.deleteUser(user.id)

    if (errorBorrado) {
      console.error('Error borrando usuario:', errorBorrado)
      return respuestaJson({ error: 'No se pudo eliminar la cuenta. Intenta de nuevo.' }, 500)
    }

    return respuestaJson({ success: true }, 200)
  } catch (error) {
    console.error('Error inesperado en eliminar-cuenta:', error)
    return respuestaJson({ error: 'Error inesperado del servidor.' }, 500)
  }
})
