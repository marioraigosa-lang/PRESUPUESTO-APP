// Marco de teléfono liviano (CSS puro, sin imagen de mockup externa) para
// mostrar capturas reales de la app en la landing: borde sutil + esquinas
// muy redondeadas imitando un smartphone actual, una barra superior a modo
// de notch minimalista, y la sombra "elevated" que ya usan las piezas hero
// de la app (ver --shadow-elevated en index.css). aspect-[750/1626] fija el
// alto antes de que la imagen cargue (evita salto de layout con lazy load).
export default function MarcoTelefono({ src, alt, eager = false, className = '' }) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-[2.25rem] border border-line bg-panel-2 p-2 shadow-elevated ${className}`}
    >
      <div
        aria-hidden="true"
        className="absolute top-3.5 left-1/2 z-10 h-4 w-16 -translate-x-1/2 rounded-full bg-bg/90"
      />
      <img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        className="aspect-[750/1626] w-full rounded-[1.75rem] bg-bg object-cover"
      />
    </div>
  )
}
