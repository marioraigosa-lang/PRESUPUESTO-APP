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

// Allowlist de orígenes autorizados a llamar esta función: producción
// (Vercel) y desarrollo local (puerto real de Vite, más 3000 por si acaso).
// A diferencia del "*" anterior, el origen SIEMPRE se valida contra esta
// lista antes de reflejarlo -- ver construirCorsHeaders() más abajo.
const ORIGENES_PERMITIDOS = [
  'https://presupuesto-app-ten-sable.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
]

// Cabeceras CORS calculadas POR PETICIÓN según el header "Origin" que
// mandó el navegador (a diferencia del objeto fijo de antes, que era el
// mismo para cualquiera). Si el origen está en la allowlist, se refleja
// literal en Access-Control-Allow-Origin (nunca "*"); si no está, ese
// header simplemente no se incluye y el navegador del origen no permitido
// bloquea la respuesta él mismo, del lado del cliente -- capa extra sobre
// la verificación por JWT de más abajo, que sigue siendo el control real.
// "Vary: Origin" evita que una respuesta cacheada para un origen se sirva
// por error a otro.
function construirCorsHeaders(origenPeticion: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }

  if (origenPeticion && ORIGENES_PERMITIDOS.includes(origenPeticion)) {
    headers['Access-Control-Allow-Origin'] = origenPeticion
  }

  return headers
}

function respuestaJson(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  const corsHeaders = construirCorsHeaders(req.headers.get('Origin'))

  // El navegador manda un preflight OPTIONS antes del POST real cuando hay
  // headers custom (Authorization) de por medio -- hay que responderlo con
  // los headers CORS y sin cuerpo, o el POST real nunca llega a salir.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return respuestaJson({ error: 'Método no permitido, se espera POST.' }, 405, corsHeaders)
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
      return respuestaJson({ error: 'Configuración del servidor incompleta.' }, 500, corsHeaders)
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
      return respuestaJson({ error: 'No autenticado.' }, 401, corsHeaders)
    }

    const clienteVerificador = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: errorUsuario,
    } = await clienteVerificador.auth.getUser()

    if (errorUsuario || !user) {
      return respuestaJson({ error: 'No autenticado.' }, 401, corsHeaders)
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
      return respuestaJson({ error: 'No se pudo eliminar la cuenta. Intenta de nuevo.' }, 500, corsHeaders)
    }

    return respuestaJson({ success: true }, 200, corsHeaders)
  } catch (error) {
    console.error('Error inesperado en eliminar-cuenta:', error)
    return respuestaJson({ error: 'Error inesperado del servidor.' }, 500, corsHeaders)
  }
})
