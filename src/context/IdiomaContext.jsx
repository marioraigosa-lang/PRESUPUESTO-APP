import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { useDatosUsuario } from '../lib/datosUsuario'
import { IDIOMA_POR_DEFECTO, IDIOMAS } from '../utils/idiomas'
import { traducir, traducirPlural } from '../i18n'

const IdiomaContext = createContext(undefined)

// Centraliza el idioma elegido por el usuario (es/en), exactamente igual
// que MonedaContext centraliza la moneda: se lee UNA vez por sesión desde
// "perfiles" y se expone a toda la app, para no repetir esa consulta en
// cada pantalla.
//
// A diferencia de la moneda, el idioma NO se puede cambiar después de
// registrarse (se elige una sola vez en Registro y viaja en los metadatos
// del signUp). Por eso este contexto solo lee "perfiles.idioma"; no expone
// una función para actualizarlo.
export function IdiomaProvider({ children }) {
  const { usuario } = useAuth()
  const { seleccionarPropio } = useDatosUsuario()
  const [idioma, setIdioma] = useState(IDIOMA_POR_DEFECTO)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancelado = false

    if (!usuario) {
      // Sin sesión no hay perfil que leer: se deja el idioma por defecto
      // (es lo que ven Login/Registro, que no requieren sesión).
      setIdioma(IDIOMA_POR_DEFECTO)
      setCargando(false)
      return
    }

    setCargando(true)

    seleccionarPropio('perfiles', 'idioma')
      .single()
      .then(({ data, error }) => {
        if (cancelado) return
        // Si la consulta falla (fila de perfiles aún no creada, sin red,
        // etc.) se sigue mostrando el idioma por defecto en vez de romper
        // la app con undefined.
        setIdioma(!error && data?.idioma in IDIOMAS ? data.idioma : IDIOMA_POR_DEFECTO)
        setCargando(false)
      })

    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario])

  // `t` es la función que van a usar los componentes para traducir cada
  // texto: t('perfil.titulo') devuelve el texto en el idioma activo (con
  // respaldo a español si la clave no existe todavía en ese idioma).
  // `valores` es opcional y sirve para insertar datos, ej.
  // t('home.pagadoPorcentaje', { porcentaje: 70 }).
  const t = useCallback((clave, valores) => traducir(idioma, clave, valores), [idioma])

  // `tp` (traducir plural) es como `t` pero para textos que cambian según
  // una cantidad (ej. "1 mes" vs "6 meses"): tp('emergencia.metaMeses', 6).
  const tp = useCallback(
    (claveBase, cantidad, valores) => traducirPlural(idioma, claveBase, cantidad, valores),
    [idioma],
  )

  const valor = useMemo(() => ({ idioma, cargando, t, tp }), [idioma, cargando, t, tp])

  return <IdiomaContext.Provider value={valor}>{children}</IdiomaContext.Provider>
}

export function useIdioma() {
  const contexto = useContext(IdiomaContext)
  if (!contexto) {
    throw new Error('useIdioma debe usarse dentro de un IdiomaProvider')
  }
  return contexto
}
