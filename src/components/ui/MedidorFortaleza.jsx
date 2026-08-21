import { evaluarFortalezaContrasena } from '../../utils/fortalezaContrasena'

// Barra + etiqueta que da feedback en tiempo real de qué tan fuerte es la
// contraseña que se está escribiendo. Es puramente informativo/motivacional:
// no bloquea el envío del formulario (eso lo sigue validando cada pantalla
// aparte, con el mínimo de 10 caracteres). Se usa en Registro.jsx y
// EstablecerNuevaContrasena.jsx, debajo del campo de contraseña -- NO en
// Login.jsx, donde solo se ingresa una contraseña ya existente.
//
// Recibe `t` (la función de traducción ya resuelta al idioma activo) en vez
// de usar useIdioma() internamente, igual que CampoTexto: así funciona en
// Registro.jsx, que traduce con un idioma local (todavía no hay sesión/perfil
// para leer de IdiomaContext) y en EstablecerNuevaContrasena.jsx, que sí usa
// useIdioma().
const COLOR_POR_NIVEL = {
  debil: 'bg-coral',
  media: 'bg-gold',
  fuerte: 'bg-mint',
  muy_fuerte: 'bg-mint',
}

const TEXTO_POR_NIVEL = {
  debil: 'text-coral',
  media: 'text-gold',
  fuerte: 'text-mint',
  muy_fuerte: 'text-mint',
}

const CLAVE_ETIQUETA_POR_NIVEL = {
  debil: 'comun.fortalezaDebil',
  media: 'comun.fortalezaMedia',
  fuerte: 'comun.fortalezaFuerte',
  muy_fuerte: 'comun.fortalezaMuyFuerte',
}

// Ancho de la barra por nivel (25/50/75/100%): un cuarto por nivel, no la
// puntuación cruda, para que el salto visual sea siempre parejo entre
// niveles sin importar el detalle interno de la puntuación.
const ANCHO_POR_NIVEL = {
  debil: '25%',
  media: '50%',
  fuerte: '75%',
  muy_fuerte: '100%',
}

// Pista breve de qué le falta. Solo UNA a la vez (la primera que aplique),
// para que sea discreta y no una lista regañona. No se muestra en
// "muy_fuerte" -- ahí ya no hay nada que sugerir.
function claveSugerencia(contrasena) {
  if (!/[A-Z]/.test(contrasena)) return 'comun.fortalezaSugerenciaMayuscula'
  if (!/[0-9]/.test(contrasena)) return 'comun.fortalezaSugerenciaNumero'
  if (!/[^a-zA-Z0-9]/.test(contrasena)) return 'comun.fortalezaSugerenciaSimbolo'
  if (contrasena.length < 12) return 'comun.fortalezaSugerenciaLongitud'
  return null
}

function MedidorFortaleza({ contrasena, t }) {
  if (!contrasena) return null

  const { nivel } = evaluarFortalezaContrasena(contrasena)
  const clave = nivel === 'muy_fuerte' ? null : claveSugerencia(contrasena)

  return (
    <div className="-mt-2" aria-live="polite">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel-2">
        <div
          className={`h-full rounded-full transition-all duration-300 ${COLOR_POR_NIVEL[nivel]}`}
          style={{ width: ANCHO_POR_NIVEL[nivel] }}
        />
      </div>
      <p className={`mt-1 text-xs font-medium ${TEXTO_POR_NIVEL[nivel]}`}>
        {t(CLAVE_ETIQUETA_POR_NIVEL[nivel])}
      </p>
      {clave && <p className="text-xs text-text-dim">{t(clave)}</p>}
    </div>
  )
}

export default MedidorFortaleza
