import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { useDatosUsuario } from '../lib/datosUsuario'

const GuiaContext = createContext(undefined)

// Centraliza si el usuario ya vio la guía de bienvenida (perfiles.guia_vista),
// igual que MonedaContext/IdiomaContext centralizan moneda e idioma: se lee
// UNA vez por sesión desde "perfiles" y se expone a toda la app -- hoy solo
// App.jsx la necesita, para decidir si mostrar el overlay de bienvenida
// (GuiaBienvenida.jsx).
export function GuiaProvider({ children }) {
  const { usuario } = useAuth()
  const { seleccionarPropio, actualizarPropio } = useDatosUsuario()
  // Por defecto en `true` (bienvenida NO se muestra): así, mientras no haya
  // sesión o la consulta todavía no responda, nunca se corre el riesgo de
  // mostrar el overlay de más -- "cargando" es lo que realmente gatilla la
  // espera en App.jsx, este valor por defecto es solo la opción segura.
  const [guiaVista, setGuiaVista] = useState(true)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancelado = false

    if (!usuario) {
      // Sin sesión no hay perfil que leer (PantallaAuth se muestra en su
      // lugar, así que este valor no llega a importar).
      setGuiaVista(true)
      setCargando(false)
      return
    }

    setCargando(true)

    seleccionarPropio('perfiles', 'guia_vista')
      .single()
      .then(({ data, error }) => {
        if (cancelado) return
        // Si la consulta falla (fila de perfiles aún no creada, sin red,
        // etc.) se asume que ya se vio: es más seguro mostrar de menos que
        // interrumpir a un usuario existente con una bienvenida repetida
        // por un error de red pasajero.
        setGuiaVista(error || data?.guia_vista == null ? true : Boolean(data.guia_vista))
        setCargando(false)
      })

    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario])

  // Actualiza el estado local de inmediato (así el overlay se cierra sin
  // esperar la respuesta del servidor) y persiste en segundo plano. Si el
  // guardado falla, no revertimos: el usuario ya cerró la bienvenida y no
  // tiene sentido volver a interrumpirlo en esta misma sesión por un error
  // de red -- en la próxima sesión se reintentará solo si la fila de
  // verdad sigue en false. Por eso, a diferencia de cambiarMoneda, esta
  // función no relanza el error: quien la llama (GuiaBienvenida.jsx) no
  // necesita manejarlo.
  const marcarGuiaVista = useCallback(async () => {
    setGuiaVista(true)
    await actualizarPropio('perfiles', { guia_vista: true })
  }, [actualizarPropio])

  const valor = useMemo(
    () => ({ guiaVista, cargando, marcarGuiaVista }),
    [guiaVista, cargando, marcarGuiaVista],
  )

  return <GuiaContext.Provider value={valor}>{children}</GuiaContext.Provider>
}

export function useGuia() {
  const contexto = useContext(GuiaContext)
  if (!contexto) {
    throw new Error('useGuia debe usarse dentro de un GuiaProvider')
  }
  return contexto
}
