// Estilo único para mensajes de error en toda la app. Antes convivían dos
// estilos distintos: una "caja" con el rojo por defecto de Tailwind
// (bg-red-500/10 text-red-400, usado en Login/Registro/listas) y texto
// suelto con el color del tema (text-coral, usado dentro de las hojas). Este
// componente unifica ambos en la caja, pero con --color-coral (el rojo
// propio del tema, no el rojo genérico de Tailwind).
//
// Devuelve null si no hay mensaje, así que se puede usar directo como
// `<MensajeError>{error}</MensajeError>` sin envolverlo en `{error && ...}`.
function MensajeError({ children, className = '' }) {
  if (!children) return null

  return <p className={`rounded-2xl bg-coral/10 px-4 py-3 text-sm text-coral ${className}`}>{children}</p>
}

export default MensajeError
