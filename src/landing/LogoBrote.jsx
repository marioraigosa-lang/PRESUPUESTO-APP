// Mismo trazo que public/icono.svg (el ícono de la app), pero sin el fondo
// -- acá se dibuja directo sobre bg-bg, para que el brote "flote" sin caja
// visible alrededor.
export default function LogoBrote({ className }) {
  return (
    <svg viewBox="0 0 140 140" className={className} aria-hidden="true">
      <path d="M70 106 L70 66" stroke="#4fd1a5" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M70 74 C50 66 38 74 34 90 C52 92 66 86 70 74 Z" fill="#4fd1a5" />
      <path d="M70 66 C90 56 104 62 110 78 C90 84 74 80 70 66 Z" fill="#4fd1a5" />
      <path d="M45 84 L62 79" stroke="#0f1512" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M84 74 L100 70" stroke="#0f1512" strokeWidth="2.5" strokeLinecap="round" fill="none" />
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
}
