# Estándar de iconos

> Referencia única para iconos de interfaz. Ver `PLAN-iconos.md` (raíz) para el
> plan completo y las fases de la Parte B (iconos de categorías).

## Reglas

| Punto | Regla |
|---|---|
| **Librería** | `lucide-react`, única. **Prohibido** usar un emoji como icono de UI. |
| **Trazo** | `strokeWidth = 2` (el default de lucide). No mezclar 1.5 / 2.5. No hace falta pasar `strokeWidth={2}` salvo en los componentes de referencia (nav, asistente), donde se deja explícito como documentación. |
| **Terminación** | `round` (default de lucide). No tocar. |
| **Color** | Siempre `currentColor` vía un token de texto de Tailwind: `text-text`, `text-text-dim`, `text-mint`, `text-coral`, `text-gold`, `text-azul`. Nunca un hex. **Única excepción:** el color de una categoría (Parte B), que llega como hex a `<IconoCategoria color={...} />`. |
| **A11y** | `aria-hidden="true"` en todo icono decorativo (que es casi siempre: suele ir acompañado de texto). Si el icono es el único contenido de un control, el `<button>` lleva `aria-label` y el icono sigue con `aria-hidden`. |
| **Implementación** | No envolver lucide en un wrapper: ya acepta `className`, `strokeWidth` y `aria-hidden`. El único componente propio es `<IconoCategoria>` (`src/components/IconoCategoria.jsx`), solo para iconos de datos (categorías / movimientos). |

## Escala de tamaños por contexto

| Contexto | px | clase Tailwind |
|---|---|---|
| Marcador inline diminuto (`Pin` en una fila, marca de tarjeta, flecha origen→destino, chip de estado) | 14 | `h-3.5 w-3.5` |
| Acciones de fila (editar / borrar), chips, iconos junto a texto pequeño | 16 | `h-4 w-4` |
| Cerrar / volver en hojas y modales | 18 | `h-[18px] w-[18px]` |
| Nav inferior, icono líder de lista (dentro de un tile de 40 px), hero de sección | 20 | `h-5 w-5` |
| Encabezado de pantalla | 24 | `h-6 w-6` |
| Ilustración *hero* dentro de un badge redondeado (estados vacíos, pantallas de confirmación) | 28 | `h-7 w-7` |

Fuera de esta escala no debería quedar ningún icono. `h-3` (12 px) y `h-8` (32 px)
se consideran desviaciones a normalizar.

### Excepción sancionada: el check

`<Check>` de selección / confirmación (listas de opción, "pagado") va con
`strokeWidth={3}`: a 16 px un check con trazo 2 se lee demasiado fino. Es el
único glifo con trazo distinto de 2 y se usa así de forma consistente.

## `ui/Icono.jsx`

Primitivo SVG dibujado a mano (`viewBox 24`, `strokeWidth 2`, `round`), anterior
a la adopción de lucide. Hoy solo lo usa `ui/BotonVolver.jsx` para el chevron de
"volver". Se deja como está; migrarlo a `<ChevronLeft>` de lucide y borrar
`Icono.jsx` es opcional y no urgente.

## Componentes de referencia (el estilo canónico)

- `src/components/NavegacionInferior.jsx` — `h-5 w-5` + `strokeWidth={2}`.
- `src/components/asistente-movimiento/pasos/PasoTipo.jsx`, `PasoCuenta.jsx`,
  `PasoMontoPago.jsx` — `h-5 w-5` + `strokeWidth={2}`.
- `src/components/asistente-movimiento/AsistenteMovimiento.jsx` (header) —
  `h-[18px] w-[18px]` + `strokeWidth={2}`.

## Pendiente (fuera del alcance de la Fase A)

- Glifos de texto `▾` como caret: `es.js`/`en.js` `metas.verProyeccion`
  (`'Ver proyección ▾'`) y el acordeón casero de `views/GuiaUso.jsx`. Migrar a
  `<ChevronDown>` en una pasada futura.
- Emojis expresivos en copy de `emergencia.*`, `metas.*`, `guia.*.titulo`
  (`⚠️ 🎉 📅 ✅ 📊 🌱 👋`): son tono, no iconos. Se conservan.
