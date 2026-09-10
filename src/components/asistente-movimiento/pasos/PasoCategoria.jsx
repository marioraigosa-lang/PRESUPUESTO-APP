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
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-dim">{t('movimientos.asistente.preguntaCategoria')}</p>
        <p className="rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text-dim">
          {t('movimientos.asistente.sinCategoriasParaElegir')}
        </p>
        <button
          type="button"
          onClick={() => onElegir('')}
          className="rounded-2xl bg-mint py-3.5 text-sm font-semibold text-bg"
        >
          {t('movimientos.asistente.continuarSinCategoria')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-dim">{t('movimientos.asistente.preguntaCategoria')}</p>
      <div className="grid grid-cols-3 gap-2">
        {categorias.map((categoria) => (
          <button
            key={categoria.id}
            type="button"
            onClick={() => onElegir(categoria.id)}
            className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-medium text-text-dim transition-transform active:scale-[0.97] ${
              categoria.id === sugeridaId ? 'bg-panel-2 ring-1 ring-mint/60' : 'bg-panel-2'
            }`}
          >
            <span className="text-lg">{categoria.emoji}</span>
            {categoria.nombre}
          </button>
        ))}
      </div>
    </div>
  )
}

export default PasoCategoria
