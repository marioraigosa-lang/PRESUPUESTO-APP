// Punto unico para pintar el icono de una categoria (o de un movimiento) a
// partir del nombre que guardara `categorias.icono` / `movimientos.icono`.
// Fase 0 del PLAN-iconos.md -- creado pero todavia NO montado en ninguna
// pantalla; las fases B lo enchufan.
//
// - Resuelve el nombre con resolverIcono() -> nunca revienta: un nombre
//   desconocido cae al icono 'tag'.
// - El color es el de la categoria (un hex), aplicado como `color` del SVG:
//   lucide dibuja con `stroke="currentColor"`, asi que basta con setear
//   `style={{ color }}`. Si no se pasa `color`, hereda el color de texto del
//   contenedor (util para los tipos ingreso/traslado/... que usan un token).
// - Tamano: la escala de ICONS.md (A2 del plan). Acepta un alias
//   ('sm' | 'md' | 'lg') o un numero de px suelto para los contextos raros
//   (14 marcador diminuto, 18 cerrar/volver).
// - aria-hidden: lucide ya lo pone solo cuando no hay children ni prop de
//   a11y; se deja explicito para que sea evidente en la lectura.
import { resolverIcono } from '../utils/catalogoIconos'

const TAMANOS = {
  sm: 16, // acciones de fila, chips
  md: 20, // icono lider de lista (tile 40px), nav, hero de seccion
  lg: 24, // encabezado de pantalla
}

function IconoCategoria({ nombre, color, size = 'md', className = '', ...resto }) {
  const Icono = resolverIcono(nombre)
  const px = typeof size === 'number' ? size : (TAMANOS[size] ?? TAMANOS.md)

  return (
    <Icono
      size={px}
      strokeWidth={2}
      aria-hidden="true"
      className={className}
      style={color ? { color } : undefined}
      {...resto}
    />
  )
}

export default IconoCategoria
