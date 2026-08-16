import MensajeError from './MensajeError'

// Input base de formulario: el `rounded-2xl bg-panel-2 px-4 py-3 text-sm ...`
// que ya se repetía en cada input de la app, con label opcional arriba y
// error opcional debajo (usando el mismo <MensajeError> que el resto de la
// app, pero en tamaño de texto xs para que quepa bien bajo un campo).
// Cualquier prop nativa de <input> (type, value, onChange, placeholder,
// autoComplete, inputMode, etc.) se pasa tal cual con `...resto`.
function CampoTexto({ id, label, error, className = '', inputClassName = '', ...resto }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1 block text-xs text-text-dim">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim ${inputClassName}`}
        {...resto}
      />
      {error && <MensajeError className="mt-1 px-3 py-2 text-xs">{error}</MensajeError>}
    </div>
  )
}

export default CampoTexto
