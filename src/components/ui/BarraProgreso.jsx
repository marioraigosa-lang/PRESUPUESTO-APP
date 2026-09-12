// Barra de progreso fina + porcentaje al lado, para los mini-resúmenes
// colapsados de Home.jsx (Gastos variables, Gastos fijos, Tarjetas). Mismo
// track/relleno que las barras ya existentes en la app (CategoriaGasto.jsx,
// Tarjeta.jsx, GastosFijos.jsx: `h-1.5 ... rounded-full bg-line` + relleno
// con backgroundColor inline) -- se extrae acá porque es la primera vez que
// se necesita reutilizar exactamente esta combinación (barra + % pintado del
// mismo color) en más de un lugar.
//
// `porcentaje` puede venir por encima de 100 (un presupuesto o cupo
// excedido) -- el texto lo muestra tal cual (para que se note CUÁNTO se
// excedió), pero el ancho visual de la barra se topa en 100% (una barra no
// puede "desbordar" su contenedor).
function BarraProgreso({ porcentaje, color, etiquetaAria, className = '' }) {
  const anchoVisual = Math.min(Math.max(porcentaje, 0), 100)

  return (
    <div className={`flex items-center gap-2 ${className}`} role="img" aria-label={etiquetaAria}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${anchoVisual}%`, backgroundColor: color }}
        />
      </div>
      <span className="shrink-0 text-xs font-semibold" style={{ color }}>
        {porcentaje}%
      </span>
    </div>
  )
}

export default BarraProgreso
