import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import MensajeError from './MensajeError'

// Input base de formulario: el `rounded-2xl bg-panel-2 px-4 py-3 text-sm ...`
// que ya se repetía en cada input de la app, con label opcional arriba y
// error opcional debajo (usando el mismo <MensajeError> que el resto de la
// app, pero en tamaño de texto xs para que quepa bien bajo un campo).
// Cualquier prop nativa de <input> (type, value, onChange, placeholder,
// autoComplete, inputMode, etc.) se pasa tal cual con `...resto`.
//
// Cuando type="password" se agrega automáticamente el botón de ojito para
// mostrar/ocultar la contraseña (alterna el type entre "password" y "text").
// El aria-label del botón lo decide quien llama, vía etiquetaMostrarContrasena/
// etiquetaOcultarContrasena (así este componente no depende de useIdioma()).
function CampoTexto({
  id,
  label,
  error,
  className = '',
  inputClassName = '',
  type,
  etiquetaMostrarContrasena,
  etiquetaOcultarContrasena,
  ...resto
}) {
  const [contrasenaVisible, setContrasenaVisible] = useState(false)
  const esContrasena = type === 'password'
  const tipoInput = esContrasena && contrasenaVisible ? 'text' : type

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1 block text-xs text-text-dim">
          {label}
        </label>
      )}
      <div className={esContrasena ? 'relative' : undefined}>
        <input
          id={id}
          type={tipoInput}
          className={`w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim ${
            esContrasena ? 'pr-11' : ''
          } ${inputClassName}`}
          {...resto}
        />
        {esContrasena && (
          <button
            type="button"
            onClick={() => setContrasenaVisible((valor) => !valor)}
            aria-label={contrasenaVisible ? etiquetaOcultarContrasena : etiquetaMostrarContrasena}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-text-dim hover:text-text"
          >
            {contrasenaVisible ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
      {error && <MensajeError className="mt-1 px-3 py-2 text-xs">{error}</MensajeError>}
    </div>
  )
}

export default CampoTexto
