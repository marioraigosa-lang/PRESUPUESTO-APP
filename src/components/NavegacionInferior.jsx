import { Home, LifeBuoy, BarChart3, Plane, MoreHorizontal } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext'

const ITEMS = [
  { id: 'inicio', clave: 'nav.inicio', Icono: Home },
  { id: 'emergencia', clave: 'nav.emergencia', Icono: LifeBuoy },
  { id: 'resumen', clave: 'nav.resumen', Icono: BarChart3 },
  { id: 'viajes', clave: 'nav.viajes', Icono: Plane },
  { id: 'mas', clave: 'nav.mas', Icono: MoreHorizontal },
]

function NavegacionInferior({ vistaActiva, onCambiarVista }) {
  const { t } = useIdioma()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-panel">
      <div className="mx-auto flex max-w-[460px] items-stretch justify-between px-1">
        {ITEMS.map((item) => {
          const activo = item.id === vistaActiva
          const Icono = item.Icono
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onCambiarVista(item.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                activo ? 'text-mint' : 'text-text-dim'
              }`}
            >
              <Icono className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              {t(item.clave)}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default NavegacionInferior
