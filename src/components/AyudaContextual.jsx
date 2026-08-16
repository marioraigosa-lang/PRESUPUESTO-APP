import { useEffect, useRef, useState } from 'react'
import { useIdioma } from '../context/IdiomaContext'

// Ícono de ayuda contextual reutilizable ("?"): al tocarlo despliega una
// burbuja con una explicación breve, y se cierra al tocarlo de nuevo o al
// tocar fuera de ella. Mismo patrón de "clic fuera para cerrar" que ya usa
// AvatarUsuario.jsx (mousedown en document + comparar contra un ref).
//
// Es un <button> independiente, NUNCA anidado dentro de un <label>: donde se
// usa, va como hermano del label/texto que acompaña, para no interferir con
// el foco ni el tap del campo asociado.
//
// `clave` es la clave de traducción del texto de ayuda (t(clave) arma la
// frase en el idioma activo); `etiqueta` es el aria-label del botón --
// obligatorio, porque un "?" solo no dice nada a un lector de pantalla.
function AyudaContextual({ clave, etiqueta }) {
  const { t } = useIdioma()
  const [abierta, setAbierta] = useState(false)
  const contenedorRef = useRef(null)

  useEffect(() => {
    if (!abierta) return

    function manejarClicFuera(evento) {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target)) {
        setAbierta(false)
      }
    }

    document.addEventListener('mousedown', manejarClicFuera)
    return () => document.removeEventListener('mousedown', manejarClicFuera)
  }, [abierta])

  return (
    <span ref={contenedorRef} className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={() => setAbierta((actual) => !actual)}
        aria-haspopup="true"
        aria-expanded={abierta}
        aria-label={etiqueta}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-panel-2 text-[11px] font-bold leading-none text-text-dim"
      >
        ?
      </button>

      {abierta && (
        <div className="absolute left-1/2 top-[calc(100%+0.5rem)] z-50 w-56 max-w-[75vw] -translate-x-1/2 rounded-2xl border border-line bg-panel-2 p-3 text-xs leading-relaxed text-text shadow-xl">
          {t(clave)}
        </div>
      )}
    </span>
  )
}

export default AyudaContextual
