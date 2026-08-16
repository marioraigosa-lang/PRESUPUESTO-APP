// Contenedor de tarjeta base: el `rounded-2xl bg-panel ...` que ya se
// repetía en decenas de pantallas. `variante` elige el tono de fondo entre
// los tokens del tema (nunca colores sueltos), `padding` deja que cada uso
// controle su propio espaciado interno, y `sombra` aplica la profundidad
// centralizada en --shadow-card/--shadow-elevated (ver index.css) -- subir
// o bajar la intensidad de TODAS las tarjetas que usan este componente es
// cuestión de tocar esos dos tokens en un solo lugar, no cada pantalla.
const FONDOS = {
  panel: 'bg-panel',
  panel2: 'bg-panel-2',
  mint: 'bg-mint/10',
}

const SOMBRAS = {
  card: 'shadow-card',
  elevada: 'shadow-elevated',
  ninguna: '',
}

function Tarjeta({ children, variante = 'panel', padding = 'p-4', sombra = 'card', className = '', ...resto }) {
  return (
    <div className={`rounded-2xl ${FONDOS[variante]} ${SOMBRAS[sombra]} ${padding} ${className}`} {...resto}>
      {children}
    </div>
  )
}

export default Tarjeta
