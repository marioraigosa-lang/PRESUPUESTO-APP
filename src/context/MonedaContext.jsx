import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { useDatosUsuario } from '../lib/datosUsuario'
import { MONEDA_POR_DEFECTO, MONEDAS } from '../utils/monedas'
import { formatearMonto } from '../utils/formatoMoneda'

const MonedaContext = createContext(undefined)

// Centraliza la moneda elegida por el usuario (COP/USD/EUR), igual que
// AuthContext centraliza la sesión: se lee UNA vez por sesión desde
// "perfiles" (creada por el trigger handle_new_user al registrarse) y se
// expone a toda la app, para no repetir esa consulta en cada pantalla.
export function MonedaProvider({ children }) {
  const { usuario } = useAuth()
  const { seleccionarPropio, actualizarPropio } = useDatosUsuario()
  const [moneda, setMoneda] = useState(MONEDA_POR_DEFECTO)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancelado = false

    if (!usuario) {
      // Sin sesión no hay perfil que leer: se deja la moneda por defecto
      // (no se muestra a nadie, PantallaAuth se muestra en su lugar).
      setMoneda(MONEDA_POR_DEFECTO)
      setCargando(false)
      return
    }

    setCargando(true)

    seleccionarPropio('perfiles', 'moneda')
      .single()
      .then(({ data, error }) => {
        if (cancelado) return
        // Si la consulta falla (fila de perfiles aún no creada, sin red,
        // etc.) se sigue mostrando la moneda por defecto en vez de romper
        // la app con undefined/NaN.
        setMoneda(!error && data?.moneda in MONEDAS ? data.moneda : MONEDA_POR_DEFECTO)
        setCargando(false)
      })

    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario])

  const cambiarMoneda = useCallback(
    async (nuevaMoneda) => {
      if (!(nuevaMoneda in MONEDAS)) {
        throw new Error('Moneda no soportada')
      }

      // perfiles.user_id es la primary key, así que actualizarPropio ya
      // apunta a la única fila del usuario sin necesitar un .eq() extra.
      const { error } = await actualizarPropio('perfiles', { moneda: nuevaMoneda })

      if (error) {
        throw new Error(error.message)
      }

      setMoneda(nuevaMoneda)
    },
    [actualizarPropio],
  )

  const valor = useMemo(
    () => ({ moneda, cargando, cambiarMoneda }),
    [moneda, cargando, cambiarMoneda],
  )

  return <MonedaContext.Provider value={valor}>{children}</MonedaContext.Provider>
}

export function useMoneda() {
  const contexto = useContext(MonedaContext)
  if (!contexto) {
    throw new Error('useMoneda debe usarse dentro de un MonedaProvider')
  }
  return contexto
}

// Devuelve una función `formatear(valor)` ya configurada con la moneda
// activa del usuario -- el reemplazo directo de la vieja formatoPesos(valor).
export function useFormatoMoneda() {
  const { moneda } = useMoneda()
  return useCallback((valor) => formatearMonto(valor, moneda), [moneda])
}
