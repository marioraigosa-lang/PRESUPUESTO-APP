import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

// Sección colapsable reutilizable para las 3 secciones de Home.jsx (Cuentas,
// Gastos fijos, Gastos variables): header completo tocable (título +
// resumen opcional + flecha) y cuerpo condicional, sin animación de altura
// -- mismo criterio que el acordeón inline que ya usaba GuiaUso.jsx. Arranca
// siempre cerrada (useState local, sin persistencia): no hay forma de que
// "recuerde" el estado entre sesiones ni entre remontajes del componente.
//
// `resumenColapsado` es responsabilidad de quien llama: cada sección conoce
// sus propios datos (saldo total, gastos pagados, presupuesto vs. gastado)
// y decide cuándo mostrarlo -- este componente solo lo pinta cuando la
// sección está cerrada y el valor no es null/undefined (así cada caller
// controla el estado "vacío"/"cargando" pasando null en vez de duplicar esa
// lógica acá). Es un nodo de React, no un string: cada sección arma su
// propia etiqueta+valor (o sus chips) con la jerarquía y el color que le
// corresponda -- este componente solo le da el espacio y lo oculta al abrir.
function Acordeon({ titulo, resumenColapsado, children }) {
  const [abierta, setAbierta] = useState(false)

  return (
    <section className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setAbierta((actual) => !actual)}
        aria-expanded={abierta}
        className="flex w-full items-center gap-3 rounded-2xl bg-panel-2 px-4 py-3 text-left transition-colors hover:bg-panel active:scale-[0.99]"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold uppercase tracking-wide text-text-dim">
            {titulo}
          </span>
          {!abierta && resumenColapsado && <div className="mt-1.5 min-w-0">{resumenColapsado}</div>}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-dim transition-transform ${abierta ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {abierta && <div className="flex flex-col gap-3">{children}</div>}
    </section>
  )
}

export default Acordeon
