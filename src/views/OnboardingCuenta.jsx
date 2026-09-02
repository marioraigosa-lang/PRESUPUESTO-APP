import { useState } from 'react'
import { Sprout } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext'
import { useAuth } from '../context/AuthContext'
import HojaCuenta from '../components/HojaCuenta'

// Se muestra en vez de la app cuando App.jsx detecta que el usuario
// autenticado no tiene NINGUNA cuenta (cuentas.length === 0) -- cubre tanto
// al usuario recién registrado como a alguien que borró todas sus cuentas
// desde GestionCuentas.jsx. Es un gate bloqueante, no un overlay: no hay
// forma de saltarlo, porque sin al menos una cuenta el resto de la app no
// tiene de dónde registrar un movimiento (ver agregarMovimiento en
// services/movimientos.js, que exige una cuenta válida).
//
// Reutiliza HojaCuenta tal cual (el mismo formulario que usa
// GestionCuentas.jsx para "+ Agregar cuenta") en vez de duplicar un
// formulario nuevo. Cerrar la hoja (X o tocar el fondo) no "salta" el
// onboarding: solo vuelve a esta pantalla de bienvenida, que se sigue
// mostrando porque App.jsx todavía ve cuentas.length === 0.
function OnboardingCuenta({ onAgregarCuenta }) {
  const { t } = useIdioma()
  const { cerrarSesion } = useAuth()
  const [hojaAbierta, setHojaAbierta] = useState(false)
  const [saliendo, setSaliendo] = useState(false)

  async function manejarCerrarSesion() {
    setSaliendo(true)
    await cerrarSesion()
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-6">
      <div className="mx-auto flex w-full max-w-[460px] flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint/10 text-mint">
            <Sprout className="h-7 w-7" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-text">{t('onboarding.cuenta.titulo')}</h1>
            <p className="mt-1 text-sm text-text-dim">{t('onboarding.cuenta.subtitulo')}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl bg-panel shadow-card p-5">
          <p className="text-sm leading-relaxed text-text-dim">{t('onboarding.cuenta.explicacion')}</p>

          <button
            type="button"
            onClick={() => setHojaAbierta(true)}
            className="w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg"
          >
            {t('onboarding.cuenta.boton')}
          </button>
        </div>

        <button
          type="button"
          onClick={manejarCerrarSesion}
          disabled={saliendo}
          className="mx-auto text-xs font-semibold text-text-dim hover:text-text disabled:opacity-60"
        >
          {saliendo ? t('perfil.cerrandoSesion') : t('perfil.cerrarSesion')}
        </button>
      </div>

      <HojaCuenta
        abierta={hojaAbierta}
        cuentaEditando={null}
        onCerrar={() => setHojaAbierta(false)}
        onGuardar={onAgregarCuenta}
        onActualizar={() => {}}
      />
    </main>
  )
}

export default OnboardingCuenta
