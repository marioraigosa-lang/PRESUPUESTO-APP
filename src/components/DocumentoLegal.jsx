import BotonVolver from './ui/BotonVolver'
import Tarjeta from './ui/Tarjeta'

// Dibuja uno de los cuatro tipos de bloque que puede tener una sección de un
// documento legal (ver la estructura documentada en
// src/data/documentosLegales.js). Vive fuera del componente para no
// recrearse en cada render.
function Bloque({ bloque }) {
  if (bloque.tipo === 'subtitulo') {
    return <p className="mt-1 text-sm font-medium text-text">{bloque.texto}</p>
  }
  if (bloque.tipo === 'lista') {
    return (
      <ul className="list-disc space-y-1 pl-5">
        {bloque.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    )
  }
  if (bloque.tipo === 'listaOrdenada') {
    return (
      <ol className="list-decimal space-y-1 pl-5">
        {bloque.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    )
  }
  return <p>{bloque.texto}</p>
}

// Pantalla de solo lectura genérica para un documento legal (Política de
// Tratamiento de Datos, Términos y Condiciones). No sabe nada del contenido
// en sí -- recibe `documento` con la forma { titulo, version,
// ultimaActualizacion, secciones } (ver src/data/documentosLegales.js) y solo
// se encarga de mostrarlo con el estilo de la app. Agregar un tercer
// documento el día de mañana es sumar sus datos y una vista delgada que
// reutilice este mismo componente, no duplicar el layout.
function DocumentoLegal({ documento, onVolver, volverAria, metaTexto }) {
  return (
    <main className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pb-28">
        <header className="flex items-start gap-3">
          <BotonVolver onClick={onVolver} ariaLabel={volverAria} className="mt-1" />
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-snug text-text">{documento.titulo}</h1>
            <p className="mt-1 text-xs text-text-dim">{metaTexto}</p>
          </div>
        </header>

        <div className="flex flex-col gap-4">
          {documento.secciones.map((seccion) => (
            <Tarjeta key={seccion.titulo}>
              <h2 className="mb-2 text-sm font-semibold text-text">{seccion.titulo}</h2>
              <div className="flex flex-col gap-2 text-sm leading-relaxed text-text-dim">
                {seccion.bloques.map((bloque, indice) => (
                  <Bloque key={indice} bloque={bloque} />
                ))}
              </div>
            </Tarjeta>
          ))}
        </div>
      </div>
    </main>
  )
}

export default DocumentoLegal
