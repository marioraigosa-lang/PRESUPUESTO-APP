import Icono from './Icono'

// Botón de "volver" estándar de toda la app. Antes cada pantalla dibujaba el
// mismo círculo con el carácter de texto "←" copiado y pegado; acá se
// reemplaza por un chevron SVG de verdad (mismo trazo que cualquier otro
// ícono de la app, ver Icono.jsx) y se agrega un pequeño "press" al tocar
// (active:scale-95) para que se sienta más táctil.
//
// `etiqueta` es opcional: si se pasa (ej. "Volver" o "Viajes"), el botón
// crece y muestra el texto al lado del ícono; si no se pasa, se queda como
// el círculo solo -- el mismo tamaño (h-8 w-8) que tenía antes en todas las
// pantallas, para no descuadrar ningún encabezado existente.
function BotonVolver({ onClick, etiqueta, ariaLabel, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full text-text-dim transition-colors hover:bg-panel-2 hover:text-text active:scale-95 ${
        etiqueta ? 'px-3' : 'w-8'
      } ${className}`}
    >
      <Icono tamano="sm">
        <polyline points="15 18 9 12 15 6" />
      </Icono>
      {etiqueta && <span className="text-sm font-medium">{etiqueta}</span>}
    </button>
  )
}

export default BotonVolver
