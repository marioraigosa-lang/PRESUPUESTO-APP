import { useIdioma } from '../../../context/IdiomaContext'

// Mismo grid de categorías que HojaNuevoMovimiento, pero en su propia
// pantalla y con AUTO-AVANCE: tocar una categoría la elige y pasa al
// siguiente paso en el mismo toque, así que ya no hace falta mostrar la
// descripción de la categoría seleccionada (no queda tiempo de leerla).
// borrador.categoriaId ya viene precargado con la última categoría usada
// (ver ultimoUsado.js y ELEGIR_TIPO en reductorAsistente.js) cuando no hay
// preselección explícita -- se resalta con un anillo, sin auto-avanzar sola.
function PasoCategoria({ borrador, categorias, onElegir }) {
  const { t } = useIdioma()
  const sugeridaId = borrador.categoriaId

  // Sin categorías propias (se borraron todas -- GestionCategorias.jsx no
  // exige un mínimo de 1, a diferencia de las cuentas), el grid quedaría
  // vacío y sin ningún botón que tocar: un callejón sin salida real, porque
  // este paso no tiene "Siguiente" propio (todo acá es auto-avance). La
  // base de datos SÍ admite un gasto sin categoría (categoria_id es nullable
  // y el constraint de "forma" de movimientos_traslado_forma_check no exige
  // categoría para un gasto -- ver sql/supabase_tarjetas_movimientos.sql),
  // así que la salida es dejar continuar sin elegir ninguna en vez de
  // bloquear el flujo.
  if (categorias.length === 0) {
    return (
      <div className="flex flex-col gap-5 pt-1">
        <h2 className="text-xl font-bold leading-tight text-text">
          {t('movimientos.asistente.preguntaCategoria')}
        </h2>
        <p className="rounded-xl bg-panel-2 px-4 py-3 text-sm text-text-dim">
          {t('movimientos.asistente.sinCategoriasParaElegir')}
        </p>
        <button
          type="button"
          onClick={() => onElegir('')}
          className="rounded-xl bg-mint py-3.5 text-sm font-semibold text-bg transition-transform active:scale-[0.98]"
        >
          {t('movimientos.asistente.continuarSinCategoria')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 pt-1">
      <h2 className="text-xl font-bold leading-tight text-text">
        {t('movimientos.asistente.preguntaCategoria')}
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
            <span className="text-xl" aria-hidden="true">
              {categoria.emoji}
            </span>
            <span className="line-clamp-2 leading-tight">{categoria.nombre}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default PasoCategoria
