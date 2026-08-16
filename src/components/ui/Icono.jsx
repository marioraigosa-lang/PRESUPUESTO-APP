// Envoltorio estándar para íconos SVG dibujados a mano (trazo, sin relleno).
// Estandariza el viewBox y el grosor de trazo para que cualquier ícono nuevo
// (volver, cerrar, editar...) tenga el mismo "peso" visual sin repetir estos
// atributos en cada sitio que dibuje uno. El contenido (children) son los
// elementos del SVG (<path>, <polyline>, etc.); `currentColor` hace que el
// ícono tome el color de texto del elemento que lo contiene (ej. el botón).
const TAMANOS = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

function Icono({ children, tamano = 'md', className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`${TAMANOS[tamano]} ${className}`}
    >
      {children}
    </svg>
  )
}

export default Icono
