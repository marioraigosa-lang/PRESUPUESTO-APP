import DocumentoLegal from '../components/DocumentoLegal'
import { TERMINOS_CONDICIONES } from '../data/documentosLegales'
import { useIdioma } from '../context/IdiomaContext'

// Mismo criterio que PoliticaDatos.jsx: el texto de los Términos está
// redactado para Colombia y se muestra siempre en español; solo el "chrome"
// (botón volver, línea de versión) sigue el idioma de la app.
function TerminosCondiciones({ onVolver }) {
  const { t } = useIdioma()

  return (
    <DocumentoLegal
      documento={TERMINOS_CONDICIONES}
      onVolver={onVolver}
      volverAria={t('legal.volverAria')}
      metaTexto={t('legal.metaLinea', {
        version: TERMINOS_CONDICIONES.version,
        fecha: TERMINOS_CONDICIONES.ultimaActualizacion,
      })}
      indiceTitulo={t('legal.indiceTitulo')}
    />
  )
}

export default TerminosCondiciones
