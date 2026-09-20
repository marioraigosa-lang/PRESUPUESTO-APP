import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import RaizApp from './RaizApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RaizApp />
  </StrictMode>,
)
