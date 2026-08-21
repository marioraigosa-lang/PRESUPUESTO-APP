import DocumentoLegal from '../components/DocumentoLegal'
import { POLITICA_DATOS } from '../data/documentosLegales'
import { useIdioma } from '../context/IdiomaContext'

// El texto de la Política en sí está redactado para Colombia (Ley 1581 de
// 2012) y por ahora se muestra siempre en español, sin importar el idioma
// de la app -- solo el "chrome" alrededor (el botón volver, la línea de
// versión) se traduce con `t()`. Si más adelante se necesita una versión en
// inglés, el lugar natural es documentosLegales.js: agregar ahí un
// POLITICA_DATOS por idioma y elegir cuál pasar acá según `idioma`.
function PoliticaDatos({ onVolver }) {
  const { t } = useIdioma()

  return (
    <DocumentoLegal
      documento={POLITICA_DATOS}
      onVolver={onVolver}
      volverAria={t('legal.volverAria')}
      metaTexto={t('legal.metaLinea', {
        version: POLITICA_DATOS.version,
        fecha: POLITICA_DATOS.ultimaActualizacion,
      })}
    />
  )
}

export default PoliticaDatos
