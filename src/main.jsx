import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AvisoActualizacion from './components/AvisoActualizacion'
import { AuthProvider } from './context/AuthContext'
import { MonedaProvider } from './context/MonedaContext'
import { IdiomaProvider } from './context/IdiomaContext'
import { GuiaProvider } from './context/GuiaContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <MonedaProvider>
        <IdiomaProvider>
          <GuiaProvider>
            <App />
            {/* Hermano de <App/> a propósito: se ve en cualquier vista y no
                depende de los early-return internos de App.jsx. Dentro de
                IdiomaProvider porque usa `t`. */}
            <AvisoActualizacion />
          </GuiaProvider>
        </IdiomaProvider>
      </MonedaProvider>
    </AuthProvider>
  </StrictMode>,
)
