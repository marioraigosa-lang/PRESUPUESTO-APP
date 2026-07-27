import { useMemo } from 'react'
import { supabase } from './supabase'
import { useAuth } from '../context/AuthContext'

// Helper centralizado de la Etapa 2: en vez de que cada pantalla escriba su
// propio ".eq('user_id', ...)" (o, peor, se le olvide), toda lectura y
// escritura a las tablas de datos (cuentas, movimientos, gastos_fijos,
// categorias, fondo_emergencia, metas_ahorro) pasa por estas cuatro
// funciones. Así el filtrado por usuario queda en un solo lugar.
//
// No reemplaza RLS (eso es la Etapa 3): es la barrera del lado de la app.

function requerirUsuarioId(usuarioId) {
  if (!usuarioId) {
    throw new Error('No hay una sesión activa. Inicia sesión para continuar.')
  }
  return usuarioId
}

export function useDatosUsuario() {
  const { usuario } = useAuth()
  const usuarioId = usuario?.id ?? null

  return useMemo(
    () => ({
      usuarioId,

      // Lectura: siempre acotada al usuario logueado. Devuelve el mismo
      // "query builder" de Supabase, así que se puede seguir encadenando
      // .eq(), .order(), .gte(), .single(), etc. como de costumbre.
      seleccionarPropio(tabla, columnas = '*', opciones) {
        return supabase
          .from(tabla)
          .select(columnas, opciones)
          .eq('user_id', requerirUsuarioId(usuarioId))
      },

      // Escritura: agrega automáticamente user_id a la fila (o a cada fila,
      // si se inserta un arreglo) para que nunca llegue null a la base.
      insertarPropio(tabla, valores) {
        const id = requerirUsuarioId(usuarioId)
        const conUsuario = Array.isArray(valores)
          ? valores.map((fila) => ({ ...fila, user_id: id }))
          : { ...valores, user_id: id }

        return supabase.from(tabla).insert(conUsuario)
      },

      // Actualización: acotada al usuario logueado además de cualquier otro
      // filtro que se encadene después (normalmente .eq('id', ...)).
      actualizarPropio(tabla, valores) {
        return supabase.from(tabla).update(valores).eq('user_id', requerirUsuarioId(usuarioId))
      },

      // Borrado: mismo criterio que actualizar.
      eliminarPropio(tabla) {
        return supabase.from(tabla).delete().eq('user_id', requerirUsuarioId(usuarioId))
      },
    }),
    [usuarioId],
  )
}
