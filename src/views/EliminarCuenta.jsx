import { useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { traducirErrorAuth } from '../utils/erroresAuth'
import { useIdioma } from '../context/IdiomaContext'
import { useAuth } from '../context/AuthContext'
import BotonVolver from '../components/ui/BotonVolver'
import BotonSecundario from '../components/ui/BotonSecundario'
import CampoTexto from '../components/ui/CampoTexto'
import MensajeError from '../components/ui/MensajeError'
import Tarjeta from '../components/ui/Tarjeta'

// Pantalla de "Eliminar cuenta" (Perfil -> Zona de peligro). Reautentica con
// la contraseña actual y, solo si es correcta, invoca la Edge Function
// "eliminar-cuenta" (ver supabase/functions/eliminar-cuenta/index.ts), que
// corre del lado del servidor con permisos de administrador -- el cliente
// nunca podría borrar el usuario de auth.users directamente.
//
// Por qué NO se llama a cerrarSesion() apenas la Edge Function responde
// éxito: App.jsx decide qué pantalla mostrar mirando `sesion` (ver su
// cascada de "if"), y en cuanto `sesion` pasa a null por el signOut, TODO
// este árbol (incluida esta pantalla) se desmonta de inmediato para mostrar
// PantallaAuth -- el usuario nunca alcanzaría a leer el mensaje de
// despedida. Por eso primero se muestra la despedida (paso 'despedida', que
// no depende de `sesion` para nada) y el signOut real solo ocurre cuando el
// usuario toca "Volver al inicio" ahí, ya con el mensaje leído.
function EliminarCuenta({ onVolver }) {
  const { t } = useIdioma()
  const { usuario, cerrarSesion } = useAuth()
  const [contrasena, setContrasena] = useState('')
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState('')
  const [cuentaEliminada, setCuentaEliminada] = useState(false)
  const [saliendo, setSaliendo] = useState(false)

  async function manejarConfirmar(evento) {
    evento.preventDefault()
    if (!contrasena || eliminando) return

    setError('')
    setEliminando(true)

    // Paso 1: reautenticar con la contraseña escrita. El correo se toma de
    // la sesión activa (nunca se le pide escribirlo) -- si signInWithPassword
    // falla, es casi siempre porque la contraseña es incorrecta, y NO se
    // llega a invocar la Edge Function: nada se borra.
    const { error: errorReauth } = await supabase.auth.signInWithPassword({
      email: usuario.email,
      password: contrasena,
    })

    if (errorReauth) {
      setError(t(traducirErrorAuth(errorReauth.message)))
      setEliminando(false)
      return
    }

    // Paso 2: ya reautenticado, invoca la Edge Function. El SDK adjunta solo
    // el token de la sesión actual -- la función identifica al usuario a
    // partir de ESE token, nunca de nada que mande este cliente.
    const { error: errorFuncion } = await supabase.functions.invoke('eliminar-cuenta')

    if (errorFuncion) {
      console.error(errorFuncion)
      setError(t('eliminarCuenta.errorEliminar'))
      setEliminando(false)
      return
    }

    setEliminando(false)
    setCuentaEliminada(true)
  }

  async function manejarVolverAlInicio() {
    setSaliendo(true)
    await cerrarSesion()
  }

  if (cuentaEliminada) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-6">
        <div className="mx-auto flex w-full max-w-[460px] flex-col items-center gap-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint/10 text-mint">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="text-lg font-semibold text-text">{t('eliminarCuenta.despedidaTitulo')}</h1>
          <p className="text-sm text-text-dim">{t('eliminarCuenta.despedidaTexto')}</p>
          <BotonSecundario onClick={manejarVolverAlInicio} disabled={saliendo} className="mt-2">
            {saliendo ? t('eliminarCuenta.saliendo') : t('eliminarCuenta.despedidaBoton')}
          </BotonSecundario>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col bg-bg px-4 py-6">
      <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col gap-6 pb-28">
        <header className="flex items-center gap-3">
          <BotonVolver onClick={eliminando ? undefined : onVolver} ariaLabel={t('eliminarCuenta.volverAria')} />
          <div>
            <h1 className="text-lg font-semibold text-text">{t('eliminarCuenta.titulo')}</h1>
            <p className="text-xs text-text-dim">{t('eliminarCuenta.subtitulo')}</p>
          </div>
        </header>

        <form onSubmit={manejarConfirmar} className="flex flex-col gap-4">
          <Tarjeta variante="coral" className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-coral">
              <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
              <p className="text-sm font-semibold">{t('eliminarCuenta.advertenciaTitulo')}</p>
            </div>
            <p className="text-sm leading-relaxed text-text-dim">{t('eliminarCuenta.advertenciaTexto')}</p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-text-dim marker:text-coral/70">
              {t('eliminarCuenta.listaDatos').map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="text-sm font-medium text-coral">{t('eliminarCuenta.advertenciaFinal')}</p>
          </Tarjeta>

          <CampoTexto
            id="contrasenaEliminarCuenta"
            type="password"
            autoComplete="current-password"
            label={t('eliminarCuenta.contrasenaLabel')}
            placeholder={t('eliminarCuenta.contrasenaPlaceholder')}
            value={contrasena}
            onChange={(evento) => setContrasena(evento.target.value)}
            disabled={eliminando}
            etiquetaMostrarContrasena={t('comun.mostrarContrasena')}
            etiquetaOcultarContrasena={t('comun.ocultarContrasena')}
          />

          <MensajeError>{error}</MensajeError>

          <button
            type="submit"
            disabled={!contrasena || eliminando}
            className="w-full rounded-2xl bg-coral py-3 text-sm font-semibold text-bg transition-transform active:scale-[0.99] disabled:opacity-60 disabled:active:scale-100"
          >
            {eliminando ? t('eliminarCuenta.eliminando') : t('eliminarCuenta.botonEliminar')}
          </button>
          <BotonSecundario type="button" onClick={onVolver} disabled={eliminando}>
            {t('eliminarCuenta.cancelar')}
          </BotonSecundario>
        </form>
      </div>
    </main>
  )
}

export default EliminarCuenta
