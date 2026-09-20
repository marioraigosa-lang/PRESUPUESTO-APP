import App from './App.jsx'
import AvisoActualizacion from './components/AvisoActualizacion'
import { AuthProvider } from './context/AuthContext'
import { MonedaProvider } from './context/MonedaContext'
import { IdiomaProvider } from './context/IdiomaContext'
import { GuiaProvider } from './context/GuiaContext'

// Árbol completo de la app (providers + App), separado de main.jsx para que
// sea un chunk propio vía React.lazy (ver RaizApp en main.jsx): quien ve la
// landing nunca lo descarga hasta hacer click en el CTA.
export default function AppShell({ modoAuthInicial, onVolverALanding }) {
  return (
    <AuthProvider>
      <MonedaProvider>
        <IdiomaProvider>
          <GuiaProvider>
            <App modoAuthInicial={modoAuthInicial} onVolverALanding={onVolverALanding} />
            {/* Hermano de <App/> a propósito: se ve en cualquier vista y no
                depende de los early-return internos de App.jsx. Dentro de
                IdiomaProvider porque usa `t`. */}
            <AvisoActualizacion />
          </GuiaProvider>
        </IdiomaProvider>
      </MonedaProvider>
    </AuthProvider>
  )
}
