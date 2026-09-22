import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'

// Cuánto hay que bajar (px) antes de que el indicador empiece a desvanecerse.
const UMBRAL_SCROLL_PX = 60

// Flecha "seguí bajando" del hero (ver Landing.jsx): vive en el flujo normal
// del hero, debajo del resto de su contenido -- a diferencia de una posición
// fixed/absolute, así nunca flota encima de nada (en móvil el hero suele ser
// más alto que el viewport, y una flecha fija al fondo de la pantalla acaba
// superpuesta al último contenido visible). Fade-out apenas el usuario
// empieza a scrollear, fade-in de vuelta si sube al tope. Al tocarla, baja
// suavemente a la sección siguiente.
export default function IndicadorScroll({ destinoRef }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    function alScrollear() {
      setVisible(window.scrollY < UMBRAL_SCROLL_PX)
    }
    window.addEventListener('scroll', alScrollear, { passive: true })
    return () => window.removeEventListener('scroll', alScrollear)
  }, [])

  function irASiguienteSeccion() {
    destinoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <button
      type="button"
      onClick={irASiguienteSeccion}
      aria-label="Descubre más"
      className={`mt-10 rounded-full p-2 text-text-dim transition-opacity duration-500 ease-out hover:text-mint sm:mt-14 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <ChevronDown className="h-5 w-5 animate-bounce motion-reduce:animate-none" aria-hidden="true" />
    </button>
  )
}
