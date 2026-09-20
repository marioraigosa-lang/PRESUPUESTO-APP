import { useEffect, useRef, useState } from 'react'

// Revela un elemento (fade + slide-up sutil) la primera vez que entra en el
// viewport, vía IntersectionObserver. Si el usuario prefiere menos
// movimiento, se muestra directo sin animar -- nunca se llega a observar.
// Uso: const { ref, visible } = useRevelarAlEntrar(); <div ref={ref}
// className={visible ? 'opacity-100 translate-y-0' : 'opacity-0
// translate-y-4'}>
export function useRevelarAlEntrar() {
  const prefiereMenosMovimiento =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [visible, setVisible] = useState(prefiereMenosMovimiento)
  const ref = useRef(null)

  useEffect(() => {
    if (prefiereMenosMovimiento) return
    const nodo = ref.current
    if (!nodo) return

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisible(true)
          // Una sola revelación: no vuelve a ocultarse al salir del
          // viewport, así no "parpadea" si el usuario sube y baja.
          observador.unobserve(nodo)
        }
      },
      { threshold: 0.15 },
    )
    observador.observe(nodo)
    return () => observador.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { ref, visible }
}
