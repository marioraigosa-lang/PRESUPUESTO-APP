// Variante secundaria de BotonPrimario: mismo tamaño/forma, pero con fondo
// tenue (panel-2) en vez de mint, para acciones menos prominentes que el CTA
// principal de la pantalla (ej. "Cerrar sesión"). El color del texto es
// `text-text` por defecto -- para acciones destructivas (como cerrar sesión)
// quien llama puede pasar className="text-coral" para sobreescribirlo, igual
// que ya se hacía a mano antes de encapsular este botón.
function BotonSecundario({ children, onClick, type = 'button', disabled = false, className = '' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl bg-panel-2 py-3 text-sm font-semibold text-text transition-transform active:scale-[0.99] disabled:opacity-60 disabled:active:scale-100 ${className}`}
    >
      {children}
    </button>
  )
}

export default BotonSecundario
