import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Revelar from './Revelar'

// Acordeón accesible (patrón "disclosure"): el <button> nativo ya da foco de
// teclado y activación con Enter/Espacio gratis -- no hace falta manejar
// key events a mano. La animación de alto usa la técnica grid-rows
// (0fr -> 1fr), que anima sin medir el alto real en JS; motion-reduce:
// desactiva la transición para quien prefiere menos movimiento.
export default function TarjetaBeneficio({ icono: Icono, titulo, descripcion, detalle, retraso }) {
  const [abierto, setAbierto] = useState(false)
  const idContenido = useId()

  return (
    <Revelar
      retraso={retraso}
      className="rounded-2xl border border-line bg-panel transition hover:border-mint/30"
    >
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        aria-expanded={abierto}
        aria-controls={idContenido}
        className="flex w-full items-start gap-4 p-6 text-left sm:p-7"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mint/10">
          <Icono className="h-5 w-5 text-mint" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-text">{titulo}</h3>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-text-dim transition-transform duration-300 motion-reduce:transition-none ${
                abierto ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-text-dim">{descripcion}</p>
        </div>
      </button>

      <div
        id={idContenido}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          abierto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-6 pb-6 pl-[60px] text-sm leading-relaxed text-text-dim sm:px-7 sm:pb-7 sm:pl-[68px]">
            {detalle}
          </p>
        </div>
      </div>
    </Revelar>
  )
}
