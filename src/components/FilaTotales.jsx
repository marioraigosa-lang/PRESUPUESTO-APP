// Fila de "chips" de totales (etiqueta + punto de color + monto), extraída
// de DetalleCuenta.jsx para reutilizarse también en DetalleCategoria.jsx
// (Fase 2). `items` es [{ etiqueta, montoTexto, colorPunto, colorTexto }];
// cada pantalla decide sus propios colores/etiquetas según su lógica de
// negocio (ingresos/egresos/neto en una, presupuesto/gastado/restante en la
// otra) -- este componente solo sabe dibujar la fila.
//
// Con un solo item (ej. una categoría sin presupuesto, que solo muestra
// "Gastado") se dibuja como un bloque de ancho completo en vez de una grilla
// de 3 columnas con dos huecos vacíos.
function FilaTotales({ items }) {
  if (items.length === 1) {
    const [item] = items
    return <Chip item={item} />
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <Chip key={item.etiqueta} item={item} />
      ))}
    </div>
  )
}

function Chip({ item }) {
  return (
    <div className="rounded-xl bg-panel-2 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.colorPunto }} />
        <span className="text-[11px] text-text-dim">{item.etiqueta}</span>
      </div>
      <p className={`mt-1 truncate text-sm font-semibold ${item.colorTexto}`}>{item.montoTexto}</p>
    </div>
  )
}

export default FilaTotales
