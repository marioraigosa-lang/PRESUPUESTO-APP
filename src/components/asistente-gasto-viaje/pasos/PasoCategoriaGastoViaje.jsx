import { useIdioma } from '../../../context/IdiomaContext'
import { resolverIconoCategoria } from '../../../utils/resolverIconoCategoria'
import IconoCategoria from '../../IconoCategoria'

// Mismo grid con AUTO-AVANCE que PasoCategoria.jsx (asistente de
// movimiento), pero sobre las categorías de ESTE viaje (con su icono/color
// propios, ver Fase VIAJE-B) en vez de las categorías reales de gasto
// variable. En la práctica este paso casi siempre se salta -- el único
// punto de entrada hoy es "+ Agregar gasto" dentro de una categoría
// (DetalleCategoriaViaje.jsx), que ya preselecciona la categoría -- pero
// queda armado para un futuro "+ Agregar gasto" genérico del viaje completo,
// y para poder CAMBIAR la categoría desde el chip del mini-resumen
// (ResumenBorradorGastoViaje.jsx -> onSaltar).
function PasoCategoriaGastoViaje({ borrador, categorias, onElegir }) {
  const { t } = useIdioma()
  const sugeridaId = borrador.categoriaId

  // Sin categorías propias en este viaje (se borraron todas), el grid
  // quedaría vacío y sin ningún botón que tocar. A diferencia del gasto real
  // (PasoCategoria.jsx), acá NO se ofrece "continuar sin categoría": el
  // formulario de siempre (HojaNuevoGastoViaje.jsx) tampoco lo permite --
  // categoria_viaje_id null queda reservado para gastos que quedaron
  // huérfanos (categoría eliminada después), no para elegirlo a mano.
  if (categorias.length === 0) {
    return (
      <div className="flex flex-col gap-5 pt-1">
        <h2 className="text-xl font-bold leading-tight text-text">
          {t('viajes.gastoAsistente.preguntaCategoria')}
        </h2>
        <p className="rounded-xl bg-panel-2 px-4 py-3 text-sm text-text-dim">
          {t('viajes.gastoFormulario.sinCategoriasDisponibles')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 pt-1">
      <h2 className="text-xl font-bold leading-tight text-text">
        {t('viajes.gastoAsistente.preguntaCategoria')}
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {categorias.map((categoria) => (
          <button
            key={categoria.id}
            type="button"
            onClick={() => onElegir(categoria.id)}
            className={`flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-center text-[11px] font-medium text-text-dim transition-all duration-150 active:scale-[0.96] ${
              categoria.id === sugeridaId
                ? 'border-transparent bg-panel-2 text-text ring-2 ring-mint/60'
                : 'border-line/60 bg-panel-2 hover:border-line hover:bg-panel-2/70'
            }`}
          >
            <IconoCategoria nombre={resolverIconoCategoria(categoria)} color={categoria.color} size="md" />
            <span className="line-clamp-2 leading-tight">{categoria.nombre}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default PasoCategoriaGastoViaje
