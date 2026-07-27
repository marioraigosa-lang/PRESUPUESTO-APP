import { useFormatoMoneda } from '../context/MonedaContext'
import { useIdioma } from '../context/IdiomaContext'

const ITEMS = [
  { clave: 'ingresos', claveTraduccion: 'home.ingresos', color: 'var(--color-mint)' },
  { clave: 'gastos', claveTraduccion: 'home.gastos', color: 'var(--color-coral)' },
  { clave: 'ahorro', claveTraduccion: 'home.ahorro', color: 'var(--color-gold)' },
]

function ResumenChips({ resumen }) {
  const formatear = useFormatoMoneda()
  const { t } = useIdioma()
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {ITEMS.map(({ clave, claveTraduccion, color }) => (
        <div key={clave} className="rounded-xl bg-panel-2 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[11px] text-text-dim">{t(claveTraduccion)}</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-text">{formatear(resumen[clave])}</p>
        </div>
      ))}
    </div>
  )
}

export default ResumenChips
