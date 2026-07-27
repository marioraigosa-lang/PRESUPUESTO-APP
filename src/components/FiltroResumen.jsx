import { useIdioma } from '../context/IdiomaContext'

function FiltroResumen({ anios, anioSeleccionado, mesSeleccionado, onCambiarAnio, onCambiarMes }) {
  const { t } = useIdioma()
  const meses = t('comun.meses')

  return (
    <section className="flex gap-2">
      <select
        value={anioSeleccionado}
        onChange={(evento) => onCambiarAnio(Number(evento.target.value))}
        className="flex-1 rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none"
      >
        {anios.map((anio) => (
          <option key={anio} value={anio}>
            {anio}
          </option>
        ))}
      </select>

      <select
        value={mesSeleccionado === null ? 'todo' : mesSeleccionado}
        onChange={(evento) =>
          onCambiarMes(evento.target.value === 'todo' ? null : Number(evento.target.value))
        }
        className="flex-[2] rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none"
      >
        <option value="todo">{t('resumen.todoElAnio')}</option>
        {meses.map((nombre, indice) => (
          <option key={nombre} value={indice}>
            {nombre.charAt(0).toUpperCase() + nombre.slice(1)}
          </option>
        ))}
      </select>
    </section>
  )
}

export default FiltroResumen
