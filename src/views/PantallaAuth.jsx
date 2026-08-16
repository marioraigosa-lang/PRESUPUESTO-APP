import { useState } from 'react'
import Login from './Login'
import Registro from './Registro'
import RecuperarContrasena from './RecuperarContrasena'

function PantallaAuth() {
  const [modo, setModo] = useState('login')

  if (modo === 'registro') {
    return <Registro onCambiarModo={() => setModo('login')} />
  }

  if (modo === 'recuperar') {
    return <RecuperarContrasena onVolver={() => setModo('login')} />
  }

  return <Login onCambiarModo={() => setModo('registro')} onRecuperar={() => setModo('recuperar')} />
}

export default PantallaAuth
