import { lazy, Suspense, useState } from 'react'
import { debeMostrarApp } from './lib/deteccionEntorno'

// Cada uno es un chunk aparte (ver vite build --> dist/assets): quien abre
// la app instalada (standalone) o ya tiene sesión nunca descarga el de
// Landing, y quien ve la Landing nunca descarga el de AppShell hasta que
// hace click en "Empezar" (ver entrarComoApp más abajo).
const AppShell = lazy(() => import('./AppShell.jsx'))
const Landing = lazy(() => import('./landing/Landing.jsx'))

// Fallback de Suspense mientras carga cualquiera de los dos chunks: mismo
// fondo que el resto de la app (--color-bg, ya aplicado por CSS antes de
// que corra este JS) para que, si llega a verse un instante, sea el mismo
// verde oscuro y no un parpadeo a blanco/otro color.
function Cargando() {
  return <div className="min-h-screen bg-bg" />
}

export default function RaizApp() {
  // Lazy initializer: corre UNA sola vez, de forma síncrona, antes del
  // primer render -- por eso no hay hueco entre "se pinta la pantalla" y
  // "se sabe qué mostrar". Ver src/lib/deteccionEntorno.js para el porqué
  // de cada chequeo.
  const [mostrarApp, setMostrarApp] = useState(() => debeMostrarApp())
  // undefined hasta que Landing llama a onEntrar(modo) -- AppShell/App/
  // PantallaAuth usan su propio default ('login') en el arranque normal
  // (app instalada o sesión ya guardada), donde nunca se pasa por Landing.
  const [modoAuthInicial, setModoAuthInicial] = useState(undefined)

  if (mostrarApp) {
    return (
      <Suspense fallback={<Cargando />}>
        <AppShell
          modoAuthInicial={modoAuthInicial}
          // Enlace "Conoce y comparte Seed" al pie del login (ver
          // PantallaAuth.jsx -> Login.jsx): vuelve a la landing sin
          // recargar la página. Solo tiene efecto visual real cuando
          // debeMostrarApp() dio un falso positivo (posibleSesionGuardada
          // con token vencido/inválido) y el usuario cae en el login sin
          // haber pasado por la landing -- en la app instalada (standalone)
          // simplemente muestra la landing dentro de la misma ventana, sin
          // romper nada.
          onVolverALanding={() => setMostrarApp(false)}
        />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<Cargando />}>
      <Landing
        onEntrar={(modo) => {
          setModoAuthInicial(modo)
          setMostrarApp(true)
        }}
      />
    </Suspense>
  )
}
