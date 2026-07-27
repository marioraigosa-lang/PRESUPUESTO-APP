import { useFormatoMoneda } from '../context/MonedaContext'
import ResumenChips from './ResumenChips'

function TarjetaSaldo({ titulo, monto, resumen }) {
  const formatear = useFormatoMoneda()
  return (
    <section className="rounded-2xl bg-panel p-6">
      <p className="text-sm text-text-dim">{titulo}</p>
      <p className="mt-2 text-4xl font-bold text-text">{formatear(monto)}</p>
      {resumen && <ResumenChips resumen={resumen} />}
    </section>
  )
}

export default TarjetaSaldo
