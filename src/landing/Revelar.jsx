import { useRevelarAlEntrar } from './useRevelarAlEntrar'

// Envoltorio de fade + slide-up sutil al entrar en el viewport (ver
// useRevelarAlEntrar.js). duracionMs/distanciaPx suben para secciones que
// merecen más protagonismo (ej. Propósito) -- ver Landing.jsx.
export default function Revelar({
  as: Etiqueta = 'div',
  children,
  className = '',
  retraso = 0,
  duracionMs = 700,
  distanciaPx = 24,
}) {
  const { ref, visible } = useRevelarAlEntrar()
  return (
    <Etiqueta
      ref={ref}
      style={{
        transitionDelay: visible ? `${retraso}ms` : '0ms',
        transitionDuration: `${duracionMs}ms`,
        transform: visible ? 'translateY(0)' : `translateY(${distanciaPx}px)`,
      }}
      className={`transition-[opacity,transform] ease-out motion-reduce:transition-none motion-reduce:!transform-none ${
        visible ? 'opacity-100' : 'opacity-0'
      } ${className}`}
    >
      {children}
    </Etiqueta>
  )
}
