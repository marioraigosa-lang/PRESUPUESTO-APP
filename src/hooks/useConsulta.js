import { useEffect, useRef, useState } from 'react'

// useConsulta centraliza el patrón "cargando / error / datos" que hoy se
// repite a mano en cada pantalla que lee de Supabase (normalmente con el
// helper seleccionarPropio de useDatosUsuario).
//
// Cómo usarlo:
//
//   async function cargarMovimientos() {
//     const { data, error } = await seleccionarPropio('movimientos').eq(...)
//     if (error) throw new Error(error.message)
//     return data.map((m) => ({ ...m, algo: 'transformado' }))
//   }
//
//   const {
//     datos: movimientos,
//     cargando,
//     error,
//     recargar,
//     establecerDatos: setMovimientos,
//   } = useConsulta(cargarMovimientos, [version, periodo.anio, periodo.mes], [])
//
// - `consulta`: función async que hace la(s) consulta(s) (puede usar
//   seleccionarPropio una o varias veces, incluso en paralelo con
//   Promise.all) y devuelve los datos ya listos para pintar. Si hay error,
//   debe lanzarlo (throw new Error(...)) en vez de devolverlo — el hook lo
//   captura y lo deja en `error.message`. Esto respeta el filtrado por
//   user_id que ya hace seleccionarPropio (el hook no lo reemplaza, solo
//   envuelve el ciclo de carga).
// - `dependencias`: igual que el segundo argumento de useEffect; cuando
//   cambian, se vuelve a ejecutar `consulta`. `consulta` en sí NO necesita
//   estar en ese arreglo (el hook siempre usa la versión más reciente),
//   así que se comporta igual que los useEffect actuales que solo
//   dependen de cosas como [version, periodo.anio, periodo.mes].
// - `valorInicial`: qué mostrar mientras se hace la primera carga (por
//   ejemplo [] para listas, o {} para un objeto). Por defecto null.
//
// Devuelve:
// - `datos`: el resultado de `consulta`, o `valorInicial` mientras carga.
// - `cargando`: true mientras la consulta está en curso.
// - `error`: `true` si algo falló, o null. Ya no expone `err.message` (que
//   puede traer texto crudo de Supabase/Postgres con nombres de tabla o
//   columna) -- solo indica que hubo un error, y quien llama muestra su
//   propio mensaje traducido y genérico. El detalle técnico completo queda
//   en la consola (console.error) para depuración.
// - `recargar()`: vuelve a ejecutar la consulta sin esperar a que cambien
//   las dependencias (útil después de guardar algo, por ejemplo).
// - `establecerDatos`: el setState crudo, para actualizaciones optimistas
//   locales (por ejemplo quitar un elemento de la lista al eliminarlo, sin
//   tener que volver a pedirle todo a Supabase).
export function useConsulta(consulta, dependencias = [], valorInicial = null) {
  const [datos, setDatos] = useState(valorInicial)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [intento, setIntento] = useState(0)

  // Usamos un ref para siempre llamar a la versión más reciente de
  // `consulta` sin tener que meterla en el arreglo de dependencias del
  // useEffect (si lo hiciéramos, se re-ejecutaría en cada render, porque
  // los componentes suelen pasar una función nueva cada vez).
  const consultaRef = useRef(consulta)
  consultaRef.current = consulta

  useEffect(() => {
    let cancelado = false

    async function ejecutar() {
      setCargando(true)
      setError(null)

      try {
        const resultado = await consultaRef.current()
        if (!cancelado) {
          setDatos(resultado)
        }
      } catch (err) {
        if (!cancelado) {
          console.error(err)
          setError(true)
        }
      } finally {
        if (!cancelado) {
          setCargando(false)
        }
      }
    }

    ejecutar()

    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, intento])

  function recargar() {
    setIntento((n) => n + 1)
  }

  return { datos, cargando, error, recargar, establecerDatos: setDatos }
}
