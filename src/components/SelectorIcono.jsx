import { useState } from 'react'
import { Search } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext'
import { GRUPOS_ICONOS } from '../utils/catalogoIconos'
import IconoCategoria from './IconoCategoria'

// Fase B4 del PLAN-iconos.md: reemplaza el input de emoji + 12 sugerencias
// de HojaCategoria.jsx por un grid del catálogo completo (catalogoIconos.js,
// ~159 iconos en 12 grupos), agrupado, con buscador y color de la categoría
// ya aplicado en cada celda (para ver de una cómo va a quedar antes de
// elegir). `HojaNuevaCategoriaViaje.jsx` sigue con el selector de emoji
// viejo por ahora -- ver la nota de alcance en PLAN-iconos.md (Fase VIAJE).
const COLUMNAS = 5

// Sinónimos en español para los iconos más buscados -- no cubre las ~159
// entradas del catálogo (para eso ya está el nombre en inglés de lucide),
// solo los que reemplazan a los 12 EMOJIS_SUGERIDOS que tenía el selector
// de emoji más los más obvios de cada grupo. Si falta uno común, se agrega
// acá; el resto cae al match por nombre inglés.
const SINONIMOS = {
  'shopping-cart': ['compras', 'mercado', 'super', 'supermercado'],
  'shopping-bag': ['compras', 'bolsa'],
  fuel: ['gasolina', 'combustible', 'nafta'],
  pill: ['pastilla', 'medicina', 'remedio'],
  clapperboard: ['cine', 'pelicula', 'peliculas'],
  sparkles: ['varios', 'otros'],
  house: ['casa', 'hogar'],
  utensils: ['comida', 'restaurante', 'cubiertos'],
  shirt: ['ropa', 'camisa'],
  'book-open': ['libro', 'lectura', 'estudio'],
  'paw-print': ['mascota', 'perro', 'gato'],
  gift: ['regalo'],
  coffee: ['cafe'],
  car: ['auto', 'carro', 'coche'],
  'car-taxi-front': ['taxi'],
  bus: ['autobus', 'colectivo'],
  plane: ['avion', 'vuelo'],
  hotel: ['hospedaje'],
  pin: ['fijo', 'anclado'],
  heart: ['corazon', 'amor'],
  stethoscope: ['medico', 'doctor'],
  'graduation-cap': ['educacion', 'universidad'],
  briefcase: ['trabajo', 'oficina'],
  'gamepad-2': ['juegos', 'videojuegos'],
  music: ['musica'],
  wifi: ['internet'],
  phone: ['telefono', 'celular'],
  zap: ['electricidad', 'luz'],
  droplet: ['agua'],
  flame: ['gas'],
  baby: ['bebe', 'hijo'],
  tag: ['etiqueta'],
  wallet: ['billetera'],
  'piggy-bank': ['ahorro', 'alcancia'],
  'credit-card': ['tarjeta'],
  banknote: ['efectivo', 'dinero'],
  tent: ['camping'],
  luggage: ['equipaje', 'maleta'],
}

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

function coincide(nombreIcono, consultaNormalizada) {
  if (!consultaNormalizada) return true
  if (normalizar(nombreIcono.replace(/-/g, ' ')).includes(consultaNormalizada)) return true
  const sinonimos = SINONIMOS[nombreIcono]
  return sinonimos ? sinonimos.some((s) => normalizar(s).includes(consultaNormalizada)) : false
}

function filtrarGrupos(busqueda) {
  const consulta = normalizar(busqueda)
  return GRUPOS_ICONOS.map((grupo) => ({
    ...grupo,
    iconos: grupo.iconos.filter((nombre) => coincide(nombre, consulta)),
  })).filter((grupo) => grupo.iconos.length > 0)
}

function SelectorIcono({ valor, onCambiar, color }) {
  const { t } = useIdioma()
  const [busqueda, setBusqueda] = useState('')

  const grupos = filtrarGrupos(busqueda)
  const listaPlana = grupos.flatMap((grupo) => grupo.iconos)
  const refsBotones = []
  // Ancla del "roving tabindex": el icono elegido, o el primero visible si
  // el elegido quedó afuera del filtro de búsqueda (si no, ningún botón
  // tendría tabIndex 0 y el grid dejaría de ser alcanzable por teclado).
  const seleccionadoVisible = listaPlana.includes(valor)

  function manejarTeclado(evento, indice) {
    let nuevoIndice = indice
    switch (evento.key) {
      case 'ArrowRight':
        nuevoIndice = Math.min(indice + 1, listaPlana.length - 1)
        break
      case 'ArrowLeft':
        nuevoIndice = Math.max(indice - 1, 0)
        break
      case 'ArrowDown':
        nuevoIndice = Math.min(indice + COLUMNAS, listaPlana.length - 1)
        break
      case 'ArrowUp':
        nuevoIndice = Math.max(indice - COLUMNAS, 0)
        break
      case 'Home':
        nuevoIndice = 0
        break
      case 'End':
        nuevoIndice = listaPlana.length - 1
        break
      default:
        return
    }
    evento.preventDefault()
    const nombre = listaPlana[nuevoIndice]
    onCambiar(nombre)
    refsBotones[nuevoIndice]?.focus()
  }

  let contador = -1

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-2xl bg-panel-2 px-3 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-text-dim" aria-hidden="true" />
        <input
          type="text"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder={t('categorias.formulario.iconoBuscarPlaceholder')}
          aria-label={t('categorias.formulario.iconoBuscarAria')}
          className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-dim"
        />
      </div>

      <div
        role="radiogroup"
        aria-label={t('categorias.formulario.iconoAria')}
        className="max-h-56 overflow-y-auto rounded-2xl bg-panel-2/60 p-3"
      >
        {listaPlana.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-text-dim">
            {t('categorias.formulario.iconoSinResultados')}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {grupos.map((grupo) => (
              <div key={grupo.clave}>
                <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-text-dim">
                  {t(`iconos.grupos.${grupo.clave}`)}
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {grupo.iconos.map((nombre) => {
                    contador += 1
                    const indice = contador
                    const seleccionado = nombre === valor
                    return (
                      <button
                        key={nombre}
                        ref={(el) => {
                          refsBotones[indice] = el
                        }}
                        type="button"
                        role="radio"
                        aria-checked={seleccionado}
                        aria-label={t('categorias.formulario.iconoOpcionAria', { nombre })}
                        tabIndex={seleccionado || (!seleccionadoVisible && indice === 0) ? 0 : -1}
                        onClick={() => onCambiar(nombre)}
                        onKeyDown={(evento) => manejarTeclado(evento, indice)}
                        className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all active:scale-95 ${
                          seleccionado ? 'bg-mint/15 ring-2 ring-mint' : 'bg-panel hover:bg-panel/70'
                        }`}
                      >
                        <IconoCategoria nombre={nombre} color={color} size="md" />
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SelectorIcono
