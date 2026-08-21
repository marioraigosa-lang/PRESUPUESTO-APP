import { useState } from 'react'
import { useIdioma } from '../context/IdiomaContext'
import { useAuth } from '../context/AuthContext'
import PasoCodigoMfa from '../components/PasoCodigoMfa'
import BotonSecundario from '../components/ui/BotonSecundario'

// Se muestra en vez de la app cuando App.jsx detecta `requiereVerificacionMfa`
// (sesión en AAL1 con al menos un factor TOTP verificado esperando
// confirmación). No se llega acá si el usuario no tiene 2FA activo -- ver
// AuthContext.jsx.
function VerificarMfa() {
  const { t } = useIdioma()
  const { factoresMfa, cargandoMfa, cerrarSesion } = useAuth()
  const [saliendo, setSaliendo] = useState(false)

  async function manejarUsarOtraCuenta() {
    setSaliendo(true)
    await cerrarSesion()
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-6">
      <div className="mx-auto flex w-full max-w-[460px] flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint text-2xl font-bold text-bg">
            S
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text">{t('seguridad.verificarTitulo')}</h1>
            <p className="text-xs text-text-dim">{t('seguridad.verificarSubtitulo')}</p>
          </div>
        </div>

        <PasoCodigoMfa
          factoresMfa={factoresMfa}
          cargandoMfa={cargandoMfa}
          t={t}
          textoBoton={t('seguridad.verificarYEntrar')}
          textoVerificando={t('seguridad.verificando')}
        />

        <BotonSecundario onClick={manejarUsarOtraCuenta} disabled={saliendo}>
          {saliendo ? t('seguridad.saliendo') : t('seguridad.usarOtraCuenta')}
        </BotonSecundario>
      </div>
    </main>
  )
}

export default VerificarMfa
