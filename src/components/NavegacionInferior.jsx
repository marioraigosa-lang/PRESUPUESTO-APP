import { useIdioma } from '../context/IdiomaContext'

const ITEMS = [
  { id: 'inicio', clave: 'nav.inicio', icono: '🏠' },
  { id: 'emergencia', clave: 'nav.emergencia', icono: '🛟' },
  { id: 'resumen', clave: 'nav.resumen', icono: '📊' },
  { id: 'mas', clave: 'nav.mas', icono: '⋯' },
]

function NavegacionInferior({ vistaActiva, onCambiarVista }) {
  const { t } = useIdioma()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-panel">
      <div className="mx-auto flex max-w-[460px] items-stretch justify-between px-2">
        {ITEMS.map((item) => {
          const activo = item.id === vistaActiva
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onCambiarVista(item.id)}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                activo ? 'text-mint' : 'text-text-dim'
              }`}
            >
              <span className="text-lg leading-none">{item.icono}</span>
              {t(item.clave)}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default NavegacionInferior
