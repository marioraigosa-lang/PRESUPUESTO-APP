import { useState } from 'react'
import Login from './Login'
import Registro from './Registro'
import RecuperarContrasena from './RecuperarContrasena'

// modoInicial: 'login' (default) o 'registro' -- lo usa Landing.jsx para que
// "Empezar gratis" abra directo en el formulario de registro y "Ya tengo
// cuenta" en el de login, sin cambiar nada del flujo normal (recargar la
// app sin venir de la landing sigue empezando en 'login' como siempre).
function PantallaAuth({ modoInicial = 'login', onVolverALanding }) {
  const [modo, setModo] = useState(modoInicial)

  if (modo === 'registro') {
    return <Registro onCambiarModo={() => setModo('login')} />
  }

  if (modo === 'recuperar') {
    return <RecuperarContrasena onVolver={() => setModo('login')} />
  }

  return (
    <Login
      onCambiarModo={() => setModo('registro')}
      onRecuperar={() => setModo('recuperar')}
      onVolverALanding={onVolverALanding}
    />
  )
}

export default PantallaAuth
