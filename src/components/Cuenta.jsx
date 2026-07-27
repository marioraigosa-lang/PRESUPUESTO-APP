import { useFormatoMoneda } from '../context/MonedaContext'

function Cuenta({ nombre, tipo, color, saldo, inicial }) {
  const formatear = useFormatoMoneda()
  const letraInicial = inicial || nombre.charAt(0).toUpperCase()

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-panel-2 px-4 py-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-bg"
        style={{ backgroundColor: color }}
      >
        {letraInicial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">{nombre}</p>
        <p className="truncate text-xs text-text-dim">{tipo}</p>
      </div>
      <p className="shrink-0 text-sm font-semibold text-text">{formatear(saldo)}</p>
    </div>
  )
}

export default Cuenta
