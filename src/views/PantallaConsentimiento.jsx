import { useState } from 'react'
import { useIdioma } from '../context/IdiomaContext'
import { useAuth } from '../context/AuthContext'
import { useDatosUsuario } from '../lib/datosUsuario'
import { todosLosConsentimientosAceptados } from '../utils/consentimientos'
import { registrarConsentimientoVigente } from '../services/consentimientos'
import MensajeError from '../components/ui/MensajeError'
import BotonSecundario from '../components/ui/BotonSecundario'
import PoliticaDatos from './PoliticaDatos'
import TerminosCondiciones from './TerminosCondiciones'

// Se muestra en vez de la app cuando App.jsx detecta `requiereConsentimiento`
// (usuario autenticado sin fila vigente de alguno de los 3 tipos en
// "consentimientos" -- ver AuthContext.jsx). Cubre dos casos con la misma
// pantalla: cuentas viejas que nunca aceptaron nada (de antes de que
// existieran los checkboxes de Registro.jsx) y cuentas que aceptaron una
// versión de un documento que ya quedó vieja.
//
// Los 3 checkboxes y sus textos reutilizan las mismas claves i18n
// "registro.consentimiento*" que usa Registro.jsx -- es literalmente la
// misma pregunta ("¿aceptas esto?"), así que tiene sentido que compartan la
// traducción en vez de duplicarla.
function PantallaConsentimiento() {
  const { t } = useIdioma()
  const { cerrarSesion, refrescarConsentimiento } = useAuth()
  const datosUsuario = useDatosUsuario()

  const [aceptoDatos, setAceptoDatos] = useState(false)
  const [aceptoTerminos, setAceptoTerminos] = useState(false)
  const [mayorEdad, setMayorEdad] = useState(false)
  // 'politica' | 'terminos' | null -- mismo patrón que Registro.jsx: un
  // estado local en vez de una pantalla aparte, para que abrir un documento
  // y volver no pierda los checkboxes ya marcados (este componente nunca se
  // desmonta, solo cambia qué devuelve su render).
  const [documentoAbierto, setDocumentoAbierto] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const [error, setError] = useState('')

  const consentimientosCompletos = todosLosConsentimientosAceptados({
    aceptoDatos,
    aceptoTerminos,
    mayorEdad,
  })

  async function manejarAceptar() {
    if (!consentimientosCompletos || enviando) return

    setEnviando(true)
    setError('')

    try {
      await registrarConsentimientoVigente(datosUsuario)
      // Vuelve a consultar el estado real desde Supabase (en vez de asumir
      // que el insert alcanza) -- en cuanto requiereConsentimiento pasa a
      // false, App.jsx deja de mostrar esta pantalla solo. No hace falta
      // setEnviando(false) en el camino feliz: el componente se desmonta.
      await refrescarConsentimiento()
    } catch (err) {
      console.error(err)
      setError(t('consentimiento.errorGuardar'))
      setEnviando(false)
    }
  }

  async function manejarCerrarSesion() {
    setSaliendo(true)
    await cerrarSesion()
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
            <h1 className="text-lg font-semibold text-text">{t('consentimiento.titulo')}</h1>
            <p className="text-xs text-text-dim">{t('consentimiento.subtitulo')}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl bg-panel shadow-card p-5">
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

          <button
            type="button"
            onClick={manejarAceptar}
            disabled={enviando || !consentimientosCompletos}
            className="w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg disabled:opacity-60"
          >
            {enviando ? t('consentimiento.guardando') : t('consentimiento.aceptarYContinuar')}
          </button>

          <BotonSecundario onClick={manejarCerrarSesion} disabled={saliendo}>
            {saliendo ? t('perfil.cerrandoSesion') : t('perfil.cerrarSesion')}
          </BotonSecundario>
        </div>
      </div>
    </main>
  )
}

export default PantallaConsentimiento
