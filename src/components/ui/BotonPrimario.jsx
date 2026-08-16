// Botón principal de la app (CTA): fondo mint, texto sobre --color-bg. Es el
// mismo botón que ya se repetía en Login/Registro/las hojas/etc.
// (`rounded-2xl bg-mint py-3 text-sm font-semibold text-bg`), ahora
// encapsulado en un solo lugar para que un ajuste futuro (ej. el "press" que
// se agregó acá) se propague a toda la app sin tocar cada pantalla.
//
// `cargando` deshabilita el botón igual que `disabled` (evita doble envío
// mientras una acción está en curso) -- el texto que se muestra mientras
// tanto lo sigue decidiendo quien llama al componente, pasándolo como
// `children` (ej. {enviando ? t('...entrando') : t('...entrar')}), igual que
// ya se hacía antes.
function BotonPrimario({ children, onClick, type = 'button', cargando = false, disabled = false, className = '' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || cargando}
      className={`w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg transition-transform active:scale-[0.99] disabled:opacity-60 disabled:active:scale-100 ${className}`}
    >
      {children}
    </button>
  )
}

export default BotonPrimario
