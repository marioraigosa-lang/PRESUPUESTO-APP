import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'

// Cuánto hay que bajar (px) antes de que el indicador empiece a desvanecerse.
const UMBRAL_SCROLL_PX = 60

// Flecha "seguí bajando" del hero (ver Landing.jsx): fixed al fondo del
// viewport (así queda "cerca del borde inferior de la primera pantalla" sin
// importar la altura real del hero), con fade-out apenas el usuario empieza
// a scrollear y fade-in de vuelta si sube al tope. Al tocarla, baja
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
      className={`fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-1.5 text-text-dim transition-opacity duration-500 ease-out hover:text-mint sm:bottom-8 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <span className="text-[11px] font-medium tracking-wide">Descubre más</span>
      <ChevronDown className="h-5 w-5 animate-bounce motion-reduce:animate-none" aria-hidden="true" />
    </button>
  )
}
