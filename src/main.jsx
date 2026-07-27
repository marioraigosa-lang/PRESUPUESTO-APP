import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { MonedaProvider } from './context/MonedaContext'
import { IdiomaProvider } from './context/IdiomaContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <MonedaProvider>
        <IdiomaProvider>
          <App />
        </IdiomaProvider>
      </MonedaProvider>
    </AuthProvider>
  </StrictMode>,
)
