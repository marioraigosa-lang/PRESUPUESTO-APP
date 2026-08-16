// Paleta compartida por los selectores de color de HojaCuenta.jsx (color de
// una cuenta) y HojaCategoria.jsx (color de una categoría). Antes cada
// archivo tenía su propia lista de hex, parecida pero no idéntica -- esta es
// la única fuente de verdad para los dos. El primer color es el que queda
// preseleccionado en un formulario nuevo.
//
// Nota: las cuentas/categorías ya creadas guardan su color como texto plano
// en la base de datos (columna "color"), no como referencia a esta lista --
// así que cambiar estos valores no afecta a nada ya guardado, solo a las
// opciones que se ofrecen de acá en adelante.
export const COLORES_CUENTA = [
  '#4fd1a5', // mint (--color-mint)
  '#f2795b', // coral (--color-coral)
  '#e9b949', // gold (--color-gold)
  '#5aa9e6', // azul (--color-azul)
  '#9b8cf0', // violeta
  '#e07ba0', // rosa
  '#38bdf8', // celeste
  '#94a3b8', // gris
]
