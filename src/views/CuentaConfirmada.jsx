import { Sprout } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext'
import { useAuth } from '../context/AuthContext'
import MensajeError from '../components/ui/MensajeError'
import BotonPrimario from '../components/ui/BotonPrimario'
import Tarjeta from '../components/ui/Tarjeta'

// Se muestra en vez de la app justo después de que el usuario confirma su
// correo desde el enlace del registro (ver urlConfirmacionCuenta() en
// utils/urlsAuth.js, y "confirmacionCuenta"/finalizarConfirmacion() en
// AuthContext.jsx -- mismo patrón que "recuperacion"/
// EstablecerNuevaContrasena.jsx, aplicado al registro en vez de a la
// recuperación de contraseña). Antes de esto, confirmar el correo dejaba
// caer al usuario en silencio directo a la app (login automático sin ningún
// aviso, ver Registro.jsx/PantallaAuth.jsx) -- acá se le confirma
// explícitamente que ya puede usar Seed, o que el enlace venció si aplica.
function CuentaConfirmada() {
  const { t } = useIdioma()
  const { confirmacionCuenta, finalizarConfirmacion } = useAuth()
  const huboError = confirmacionCuenta === 'error'

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-6">
      <div className="mx-auto flex w-full max-w-[460px] flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint/10 text-mint">
            <Sprout className="h-7 w-7" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-text">
              {huboError ? t('cuentaConfirmada.errorTitulo') : t('cuentaConfirmada.titulo')}
            </h1>
            <p className="mt-1 text-sm text-text-dim">
              {huboError ? t('cuentaConfirmada.errorSubtitulo') : t('cuentaConfirmada.subtitulo')}
            </p>
          </div>
        </div>

        <Tarjeta padding="p-5" className="flex flex-col gap-4">
          {huboError ? (
            <MensajeError>{t('cuentaConfirmada.errorEnlaceExpirado')}</MensajeError>
          ) : (
            <p className="text-sm leading-relaxed text-text-dim">{t('cuentaConfirmada.explicacion')}</p>
          )}

          <BotonPrimario onClick={finalizarConfirmacion}>
            {huboError ? t('cuentaConfirmada.volverLogin') : t('cuentaConfirmada.continuar')}
          </BotonPrimario>
        </Tarjeta>
      </div>
    </main>
  )
}

export default CuentaConfirmada
