import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { traducirErrorAuth } from '../utils/erroresAuth'
import { MONEDA_POR_DEFECTO, MONEDAS } from '../utils/monedas'
import { IDIOMA_POR_DEFECTO, IDIOMAS } from '../utils/idiomas'
import { traducir } from '../i18n'

function Registro({ onCambiarModo }) {
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [confirmarContrasena, setConfirmarContrasena] = useState('')
  const [moneda, setMoneda] = useState(MONEDA_POR_DEFECTO)
  // Idioma elegido para la cuenta nueva. A propósito NO viene de
  // useIdioma()/IdiomaContext: ese contexto lee "perfiles.idioma" y todavía
  // no hay sesión ni perfil en esta pantalla. Es un estado local, igual que
  // "moneda" arriba -- se usa tanto para resaltar la pastilla elegida como
  // para traducir en vivo los textos de ESTA pantalla (así se puede
  // previsualizar el cambio de idioma antes de crear la cuenta), y se manda
  // en el signUp para que el trigger la guarde en el perfil nuevo.
  const [idioma, setIdioma] = useState(IDIOMA_POR_DEFECTO)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const t = (clave) => traducir(idioma, clave)

  async function manejarEnviar(evento) {
    evento.preventDefault()
    setError('')
    setMensaje('')

    if (!/\S+@\S+\.\S+/.test(correo)) {
      setError(t('registro.errorCorreoInvalido'))
      return
    }
    if (contrasena.length < 6) {
      setError(t('registro.errorContrasenaCorta'))
      return
    }
    if (contrasena !== confirmarContrasena) {
      setError(t('registro.errorContrasenasNoCoinciden'))
      return
    }

    setEnviando(true)
    const { data, error: errorSupabase } = await supabase.auth.signUp({
      email: correo.trim(),
      password: contrasena,
      // El trigger handle_new_user (en Supabase) lee moneda e idioma de
      // raw_user_meta_data para crear el perfil del usuario nuevo ya con
      // las preferencias que eligió aquí, en vez de nacer siempre en
      // COP/es.
      options: { data: { moneda, idioma } },
    })
    setEnviando(false)

    if (errorSupabase) {
      setError(t(traducirErrorAuth(errorSupabase.message)))
      return
    }

    if (!data.session) {
      setMensaje(t('registro.mensajeCuentaCreada'))
    }
    // Si data.session existe, el AuthProvider detecta el cambio de sesión
    // automáticamente (onAuthStateChange) y la app se muestra sola.
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-6">
      <div className="mx-auto flex w-full max-w-[460px] flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint text-2xl font-bold text-bg">
            S
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text">{t('registro.titulo')}</h1>
            <p className="text-xs text-text-dim">{t('registro.subtitulo')}</p>
          </div>
        </div>

        <form onSubmit={manejarEnviar} className="flex flex-col gap-4 rounded-2xl bg-panel p-5">
          <div>
            <label htmlFor="correo" className="mb-1 block text-xs text-text-dim">
              {t('registro.correo')}
            </label>
            <input
              id="correo"
              type="email"
              autoComplete="email"
              value={correo}
              onChange={(evento) => setCorreo(evento.target.value)}
              placeholder={t('registro.correoPlaceholder')}
              className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
            />
          </div>

          <div>
            <label htmlFor="contrasena" className="mb-1 block text-xs text-text-dim">
              {t('registro.contrasena')}
            </label>
            <input
              id="contrasena"
              type="password"
              autoComplete="new-password"
              value={contrasena}
              onChange={(evento) => setContrasena(evento.target.value)}
              placeholder={t('registro.contrasenaPlaceholder')}
              className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
            />
          </div>

          <div>
            <label htmlFor="confirmarContrasena" className="mb-1 block text-xs text-text-dim">
              {t('registro.confirmarContrasena')}
            </label>
            <input
              id="confirmarContrasena"
              type="password"
              autoComplete="new-password"
              value={confirmarContrasena}
              onChange={(evento) => setConfirmarContrasena(evento.target.value)}
              placeholder={t('registro.confirmarContrasenaPlaceholder')}
              className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
            />
          </div>

          <div>
            <p className="mb-1 block text-xs text-text-dim">{t('registro.monedaTitulo')}</p>
            <div className="flex gap-2 rounded-full bg-panel-2 p-1">
              {Object.values(MONEDAS).map((opcion) => (
                <button
                  key={opcion.codigo}
                  type="button"
                  onClick={() => setMoneda(opcion.codigo)}
                  className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                    moneda === opcion.codigo ? 'bg-mint text-bg' : 'text-text-dim'
                  }`}
                >
                  {opcion.codigo}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-text-dim">{t('registro.monedaNota')}</p>
          </div>

          <div>
            <p className="mb-1 block text-xs text-text-dim">{t('registro.idiomaTitulo')}</p>
            <div className="flex gap-2 rounded-full bg-panel-2 p-1">
              {Object.values(IDIOMAS).map((opcion) => (
                <button
                  key={opcion.codigo}
                  type="button"
                  onClick={() => setIdioma(opcion.codigo)}
                  className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                    idioma === opcion.codigo ? 'bg-mint text-bg' : 'text-text-dim'
                  }`}
                >
                  {opcion.etiqueta}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-text-dim">{t('registro.idiomaNota')}</p>
          </div>

          {error && (
            <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
          )}

          {mensaje && (
            <p className="rounded-2xl bg-mint/10 px-4 py-3 text-sm text-mint">{mensaje}</p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="mt-1 w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg disabled:opacity-60"
          >
            {enviando ? t('registro.creandoCuenta') : t('registro.crearCuenta')}
          </button>
        </form>

        <p className="text-center text-sm text-text-dim">
          {t('registro.yaTienesCuenta')}{' '}
          <button type="button" onClick={onCambiarModo} className="font-semibold text-mint">
            {t('registro.iniciaSesion')}
          </button>
        </p>
      </div>
    </main>
  )
}

export default Registro
