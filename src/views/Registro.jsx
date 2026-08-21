import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { traducirErrorAuth } from '../utils/erroresAuth'
import { MONEDA_POR_DEFECTO, MONEDAS } from '../utils/monedas'
import { IDIOMA_POR_DEFECTO, IDIOMAS } from '../utils/idiomas'
import { todosLosConsentimientosAceptados } from '../utils/consentimientos'
import VERSIONES_LEGALES from '../constants/versionesLegales'
import { traducir } from '../i18n'
import CampoTexto from '../components/ui/CampoTexto'
import MedidorFortaleza from '../components/ui/MedidorFortaleza'
import MensajeError from '../components/ui/MensajeError'
import PoliticaDatos from './PoliticaDatos'
import TerminosCondiciones from './TerminosCondiciones'

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
  // Los 3 consentimientos exigidos por la Ley 1581 de 2012 (política de
  // datos, términos de uso, mayoría de edad). Ninguno arranca marcado --
  // tiene que ser una acción activa del usuario, nunca un valor por defecto.
  const [aceptoDatos, setAceptoDatos] = useState(false)
  const [aceptoTerminos, setAceptoTerminos] = useState(false)
  const [mayorEdad, setMayorEdad] = useState(false)
  // 'politica' | 'terminos' | null. A propósito NO es una pantalla aparte
  // dentro de PantallaAuth.jsx: se resuelve con un estado local de ESTE
  // mismo componente, igual que calculadoraAbierta en Perfil.jsx. Como
  // Registro nunca se desmonta al abrir un documento (solo cambia qué
  // devuelve su render), correo/contraseña/checkboxes que el usuario ya
  // llenó quedan intactos en memoria al volver -- no hace falta pestaña
  // nueva ni modal para lograrlo.
  const [documentoAbierto, setDocumentoAbierto] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const t = (clave) => traducir(idioma, clave)
  const consentimientosCompletos = todosLosConsentimientosAceptados({
    aceptoDatos,
    aceptoTerminos,
    mayorEdad,
  })

  async function manejarEnviar(evento) {
    evento.preventDefault()
    setError('')
    setMensaje('')

    if (!/\S+@\S+\.\S+/.test(correo)) {
      setError(t('registro.errorCorreoInvalido'))
      return
    }
    if (contrasena.length < 10) {
      setError(t('registro.errorContrasenaCorta'))
      return
    }
    if (contrasena !== confirmarContrasena) {
      setError(t('registro.errorContrasenasNoCoinciden'))
      return
    }
    // Defensa además del botón deshabilitado: el botón ya impide llegar
    // acá sin los 3 consentimientos marcados, pero este chequeo se queda
    // como respaldo (mismo criterio que el resto de las validaciones de
    // este formulario, todas repetidas dentro de manejarEnviar).
    if (!consentimientosCompletos) {
      setError(t('registro.errorConsentimientoFaltante'))
      return
    }

    setEnviando(true)
    const { data, error: errorSupabase } = await supabase.auth.signUp({
      email: correo.trim(),
      password: contrasena,
      // El trigger handle_new_user (en Supabase) lee estos campos de
      // raw_user_meta_data: moneda/idioma para crear el perfil nuevo con las
      // preferencias elegidas acá, y acepto*/mayorEdad + version* para dejar
      // la constancia de consentimiento (Ley 1581 de 2012) en la tabla
      // "consentimientos" -- solo inserta cada fila si el valor viene en
      // 'true' y con versión (ver supabase_consentimientos.sql). Las
      // versiones se mandan desde VERSIONES_LEGALES, nunca hardcodeadas acá,
      // para que subir la versión de un documento sea cambiar un solo lugar.
      options: {
        data: {
          moneda,
          idioma,
          aceptoDatos,
          versionPolitica: VERSIONES_LEGALES.POLITICA_DATOS,
          aceptoTerminos,
          versionTerminos: VERSIONES_LEGALES.TERMINOS,
          mayorEdad,
          versionMayorEdad: VERSIONES_LEGALES.MAYOR_EDAD,
        },
      },
    })
    setEnviando(false)

    if (errorSupabase) {
      setError(t(traducirErrorAuth(errorSupabase.message)))
      return
    }

    // Con la confirmación de correo activada, Supabase no devuelve error si
    // el correo ya está registrado (para no permitir enumerar usuarios):
    // responde 200 con data.user.identities vacío y sin sesión, igual que
    // una cuenta nueva de verdad. Lo detectamos aquí para avisarle al
    // usuario en vez de mostrarle "cuenta creada" con un correo que ya es
    // suyo.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError(t('auth.errorYaRegistrado'))
      return
    }

    if (!data.session) {
      setMensaje(t('registro.mensajeCuentaCreada'))
    }
    // Si data.session existe, el AuthProvider detecta el cambio de sesión
    // automáticamente (onAuthStateChange) y la app se muestra sola.
  }

  if (documentoAbierto === 'politica') {
    return <PoliticaDatos onVolver={() => setDocumentoAbierto(null)} />
  }

  if (documentoAbierto === 'terminos') {
    return <TerminosCondiciones onVolver={() => setDocumentoAbierto(null)} />
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

        <form onSubmit={manejarEnviar} className="flex flex-col gap-4 rounded-2xl bg-panel shadow-card p-5">
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

          <CampoTexto
            id="contrasena"
            type="password"
            autoComplete="new-password"
            label={t('registro.contrasena')}
            value={contrasena}
            onChange={(evento) => setContrasena(evento.target.value)}
            placeholder={t('registro.contrasenaPlaceholder')}
            etiquetaMostrarContrasena={t('comun.mostrarContrasena')}
            etiquetaOcultarContrasena={t('comun.ocultarContrasena')}
          />
          <MedidorFortaleza contrasena={contrasena} t={t} />

          <CampoTexto
            id="confirmarContrasena"
            type="password"
            autoComplete="new-password"
            label={t('registro.confirmarContrasena')}
            value={confirmarContrasena}
            onChange={(evento) => setConfirmarContrasena(evento.target.value)}
            placeholder={t('registro.confirmarContrasenaPlaceholder')}
            etiquetaMostrarContrasena={t('comun.mostrarContrasena')}
            etiquetaOcultarContrasena={t('comun.ocultarContrasena')}
          />

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

          <div className="flex flex-col gap-3 rounded-2xl bg-panel-2 p-4">
            <label className="flex items-start gap-3 text-sm text-text-dim">
              <input
                type="checkbox"
                checked={aceptoDatos}
                onChange={(evento) => setAceptoDatos(evento.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-mint"
              />
              <span>
                {t('registro.consentimientoPoliticaPre')}{' '}
                <button
                  type="button"
                  onClick={() => setDocumentoAbierto('politica')}
                  className="font-medium text-mint underline underline-offset-2"
                >
                  {t('registro.consentimientoPoliticaLink')}
                </button>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm text-text-dim">
              <input
                type="checkbox"
                checked={aceptoTerminos}
                onChange={(evento) => setAceptoTerminos(evento.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-mint"
              />
              <span>
                {t('registro.consentimientoTerminosPre')}{' '}
                <button
                  type="button"
                  onClick={() => setDocumentoAbierto('terminos')}
                  className="font-medium text-mint underline underline-offset-2"
                >
                  {t('registro.consentimientoTerminosLink')}
                </button>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm text-text-dim">
              <input
                type="checkbox"
                checked={mayorEdad}
                onChange={(evento) => setMayorEdad(evento.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-mint"
              />
              <span>{t('registro.consentimientoMayorEdad')}</span>
            </label>
          </div>

          <MensajeError>{error}</MensajeError>

          {mensaje && (
            <p className="rounded-2xl bg-mint/10 px-4 py-3 text-sm text-mint">{mensaje}</p>
          )}

          <button
            type="submit"
            disabled={enviando || !consentimientosCompletos}
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
