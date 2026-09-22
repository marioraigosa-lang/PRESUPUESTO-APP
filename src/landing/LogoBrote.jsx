// Mismo trazo que public/icono.svg (el ícono de la app), pero sin el fondo
// -- acá se dibuja directo sobre bg-bg, para que el brote "flote" sin caja
// visible alrededor.
//
// `animado`: solo lo usa la instancia grande del hero de la landing (ver
// Landing.jsx) para la animación de entrada "brotando" -- el tallo se
// dibuja de abajo hacia arriba (stroke-dashoffset, ya que el path del tallo
// va de la base a la punta) y las hojas se despliegan con un scale desde su
// punto de unión al tallo (transform-origin), en cascada. Las instancias
// chicas (nav, footer) no reciben esta prop y quedan exactamente como
// estaban: el árbol de nodos por defecto no cambia para ellas. El "glow"
// final vive en las clases de index.css, junto con la excepción de
// prefers-reduced-motion que deja el brote ya crecido y sin brillo.
export default function LogoBrote({ className, animado = false }) {
  const svg = (
    <svg
      viewBox="0 0 140 140"
      className={animado ? 'block h-full w-full' : className}
      aria-hidden="true"
    >
      <path
        d="M70 106 L70 66"
        stroke="#4fd1a5"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        className={animado ? 'brote-tallo-crecer' : undefined}
      />
      <path
        d="M70 74 C50 66 38 74 34 90 C52 92 66 86 70 74 Z"
        fill="#4fd1a5"
        className={animado ? 'brote-hoja-izq-desplegar' : undefined}
      />
      <path
        d="M70 66 C90 56 104 62 110 78 C90 84 74 80 70 66 Z"
        fill="#4fd1a5"
        className={animado ? 'brote-hoja-der-desplegar' : undefined}
      />
      <path
        d="M45 84 L62 79"
        stroke="#0f1512"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        className={animado ? 'brote-vena-izq-aparecer' : undefined}
      />
      <path
        d="M84 74 L100 70"
        stroke="#0f1512"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        className={animado ? 'brote-vena-der-aparecer' : undefined}
      />
      <path
        d="M70 104 C58 104 58 114 70 114 C82 114 82 124 70 124"
        stroke="#4fd1a5"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M70 99 L70 129" stroke="#4fd1a5" strokeWidth="6" strokeLinecap="round" fill="none" />
    </svg>
  )

  if (!animado) return svg

  return (
    <span className={`relative inline-block ${className ?? ''}`}>
      <span
        aria-hidden="true"
        className="-inset-3 -z-10 absolute rounded-full bg-mint/50 blur-lg brote-glow-respirar"
      />
      {svg}
    </span>
  )
}
