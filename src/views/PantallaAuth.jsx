import { useState } from 'react'
import Login from './Login'
import Registro from './Registro'

function PantallaAuth() {
  const [modo, setModo] = useState('login')

  return modo === 'login' ? (
    <Login onCambiarModo={() => setModo('registro')} />
  ) : (
    <Registro onCambiarModo={() => setModo('login')} />
  )
}

export default PantallaAuth
