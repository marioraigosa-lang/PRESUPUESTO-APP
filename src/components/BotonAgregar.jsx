import { useIdioma } from '../context/IdiomaContext'

// FAB (botón flotante) genérico: nació solo para Home (registrar
// movimiento), `etiqueta` lo abre a otros orígenes (ej. DetalleViaje.jsx,
// registrar gasto de viaje) sin duplicar el estilo/posición/z-index. Sin
// `etiqueta`, conserva el texto de siempre (Home no cambia).
function BotonAgregar({ onClick, etiqueta }) {
  const { t } = useIdioma()
  const texto = etiqueta ?? t('home.registrarMovimiento')

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={texto}
      className="fixed bottom-20 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-mint px-5 py-3.5 text-sm font-semibold text-bg shadow-lg shadow-black/40 transition-transform active:scale-95"
    >
      <span className="text-lg font-light leading-none">+</span>
      {texto}
    </button>
  )
}

export default BotonAgregar
