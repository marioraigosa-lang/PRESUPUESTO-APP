import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
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
          </GuiaProvider>
        </IdiomaProvider>
      </MonedaProvider>
    </AuthProvider>
  </StrictMode>,
)
