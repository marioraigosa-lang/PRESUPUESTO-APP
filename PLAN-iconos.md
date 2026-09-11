# Plan — Unificación visual de iconos

> Documento de trabajo para seguir por fases en próximas sesiones.
> Estado: **planificado, nada implementado.** Creado 2026-09-10.
>
> Objetivo: coherencia visual total con iconos de línea finos (como la nav
> inferior y el asistente rediseñado). Hoy hay mezcla de emojis y iconos.
>
> **Parte A** — iconos de interfaz a estilo línea fino.
> **Parte B** — iconos de categorías: de emoji a icono de línea con el color
> de la categoría, incluyendo migración de datos existentes.

---

## Decisiones confirmadas

| Punto | Decisión |
|---|---|
| Librería | `lucide-react` (única). Prohibido emoji como icono de UI. |
| Trazo | `strokeWidth = 2` (default de lucide). No mezclar 1.5 / 2.5. Mantener 2 para no romper coherencia con nav + asistente ya hechos. |
| Columna de icono en `categorias` | **Añadir `categorias.icono text`** (nullable). **Conservar `emoji`** varios releases (red de rollback + fuente del mapeo). Drop de `emoji` solo en una fase de limpieza muy posterior. |
| `movimientos.emoji` | **Añadir `movimientos.icono`**. Mantener modelo "copia al crear" (snapshot) en el MVP. Migrar `emoji → icono`. |
| Migración | **SQL** para backfill + trigger, **+ fallback en la app** (`icono || mapaEmojiIcono(emoji) || 'tag'`) durante la ventana de despliegue. |
| **`🐜` "Gastos hormiga"** | → **`coffee`** (semántico: café / snacks / propinas). |
| **Fallback general (emoji sin equivalente)** | → **`tag`** (etiqueta). |
| Ítem "sin categoría" del Resumen | → `sparkles` (cercano al `✨` actual), distinto del fallback general `tag`. |
| Reversibilidad | Total: nunca se toca ni se borra `emoji`. Rollback de código = revertir PR; las columnas `icono` quedan inertes. |
| Categorías de viaje (`categorias_viaje`) | Sistema paralelo. **Fuera del alcance mínimo**; fase análoga opcional al final. |

---

# PARTE A — Iconos de interfaz

## A1. Inventario

### Estado real: la app ya es ~90 % `lucide-react`

~50 archivos ya importan de `lucide-react`. La "mezcla" percibida **no es UI
con emojis** — es casi toda **datos de categoría** (Parte B).

**Referencia canónica del estilo:**

| Lugar | Config |
|---|---|
| `src/components/NavegacionInferior.jsx` | `className="h-5 w-5"` + `strokeWidth={2}` — **la referencia** |
| `src/components/asistente-movimiento/pasos/PasoTipo.jsx`, `PasoCuenta.jsx`, `PasoMontoPago.jsx` | `h-5 w-5` + `strokeWidth={2}` |
| `src/components/asistente-movimiento/AsistenteMovimiento.jsx` (header) | `h-[18px] w-[18px]` + `strokeWidth={2}` |
| `src/components/ui/Icono.jsx` | primitivo SVG dibujado a mano: `viewBox 24`, `strokeWidth={2}`, `strokeLinecap/join="round"`, tamaños `sm/md/lg` = `h-4/h-5/h-6`. Lo usa `src/components/ui/BotonVolver.jsx` (chevron de "volver" de toda la app). |

**Inconsistencias menores en lucide (normalizar, no reescribir):**

- La mayoría **no pasa `strokeWidth`** → cae al default de lucide (`2`), que
  coincide con la referencia. Ya se ve bien. Acción: hacerlo explícito solo
  donde aporte, o confiar en el default de forma consistente.
- **Tamaños dispersos**: `h-3.5` (marcadores: `Pin`, `CreditCard` en
  `Movimiento.jsx`), `h-4` (acciones de fila: `Pencil`/`Trash2`), `h-5` (nav,
  hero de secciones), `h-6` (algún encabezado). No hay escala escrita.

**Emojis usados como "cuasi-icono" en COPY (i18n), no en componentes:**

| Clave | Uso | Veredicto |
|---|---|---|
| `emergencia.mensaje*`, `metas.*` (`⚠️ 🎉 📅 ✅ 📊`) | prefijo expresivo en frases de estado | **Copy expresivo, no icono.** Fuera de alcance (o fase estética muy posterior). Conservar. |
| `categorias.gestion.sistemaEtiqueta` `'🔒 Categoría del sistema'` | etiqueta-badge | **Semi-icono.** → `<Lock className="h-3 w-3" />` inline. |
| `movimientos.formulario.trasladoBadge` `'🔄 Traslado entre cuentas'` | badge | **Semi-icono.** → `<ArrowLeftRight className="h-4 w-4" />` inline. |
| `movimientos.asistente.guardarBoton` `'Guardar ✓'` | check en botón | Dejar, o `<Check>` + "Guardar". Trivial. |
| `guia.*.titulo` (`🌱 👋`) | títulos de bienvenida | **Marca / expresivo.** Conservar. |

**Emojis que son DATOS (no tocar en Parte A; van en Parte B):**

- `src/utils/construirDatosMovimiento.js`: `💰` (ingreso), `🔄` (traslado),
  `🏧` (retiro), `💳` (pago_tarjeta), `✨` (gasto sin categoría) → se guardan
  en `movimientos.emoji`.
- `src/services/gastosFijos.js`: `📌` → `movimientos.emoji` al marcar pagado.
- `src/components/HojaPagoTarjeta.jsx`: `💳` → `movimientos.emoji`.
- `categorias.emoji`, `categorias_viaje.emoji` → Parte B.

**Sin glifos de texto como icono** (`←`, `×`, etc.): ya erradicados (ver
comentario en `src/components/ui/BotonVolver.jsx`).

## A2. El estándar (a documentar en `src/components/ui/ICONS.md`)

```
Librería:     lucide-react (única). Prohibido emoji como icono de UI.
Trazo:        strokeWidth = 2 (default de lucide). No mezclar 1.5 / 2.5.
Terminación:  round (default de lucide).
Color:        SIEMPRE currentColor vía token de texto
              (text-text, text-text-dim, text-mint, text-coral, text-gold, text-azul).
              Nunca hex salvo color de categoría (Parte B).
A11y:         aria-hidden="true" salvo que el icono sea el único contenido
              accionable (entonces el <button> lleva aria-label).
```

**Escala de tamaños por contexto:**

| Contexto | px | clase |
|---|---|---|
| Marcador inline diminuto (`Pin`, marca de tarjeta en fila) | 14 | `h-3.5 w-3.5` |
| Acciones de fila (editar/borrar), chips | 16 | `h-4 w-4` |
| Cerrar/volver en hojas y modales | 18 | `h-[18px] w-[18px]` |
| Nav inferior, icono líder de lista (dentro de tile 40 px), hero de sección | 20 | `h-5 w-5` |
| Encabezado de pantalla / ilustración pequeña | 24 | `h-6 w-6` |

**Implementación:** NO envolver lucide en un wrapper (ya acepta
`className`/`strokeWidth`/`aria-hidden`). Sí crear **un** componente nuevo
para categorías: `<IconoCategoria nombre={} color={} size="md" />` (Parte B).
`ui/Icono.jsx` se mantiene solo para el chevron de `BotonVolver` — o se migra
ese a `<ChevronLeft>` de lucide y se elimina `Icono.jsx` (2 archivos,
opcional; **recomendado dejarlo como está en esta iteración**).

## A3. Pantallas / componentes a tocar en la Parte A

| Área | Acción |
|---|---|
| Todos los `.jsx` con lucide (~50) | Barrido: fijar tamaños a la escala A2; quitar `strokeWidth` redundante o normalizarlo; asegurar `aria-hidden`. Cambio mecánico, revisable archivo por archivo, por lotes (`views/`, `components/`, `asistente/`). |
| `ui/Icono.jsx` + `ui/BotonVolver.jsx` | Dejar como está (ya cumple). Alternativa opcional: migrar `BotonVolver` a `<ChevronLeft>` de lucide y borrar `Icono.jsx`. |
| `GestionCategorias.jsx` (`sistemaEtiqueta`) | `🔒` → `<Lock className="h-3 w-3" />` dentro del badge. |
| `HojaNuevoMovimiento.jsx` (`trasladoBadge`) | `🔄` → `<ArrowLeftRight className="h-4 w-4" />`. |
| i18n `es.js`/`en.js` | Quitar el emoji de esas 2-3 claves (el icono pasa al JSX). Las de `emergencia.*`/`metas.*` se **dejan**. |
| `Movimiento.jsx` | Se toca en Parte B (icono líder de la fila). |

**Entregable de A:** `src/components/ui/ICONS.md` + PR de normalización.

## A4. UI (cambiar) vs datos (conservar)

- **Cambiar (UI):** todo lo de A3.
- **Conservar (datos que NO son categoría):** `movimientos.emoji` de tipos
  ingreso/traslado/retiro/pago_tarjeta y `📌` — pero se migran a `icono` en
  la Parte B (B5), porque comparten columna con el icono de categoría en la
  fila de movimiento.
- **Conservar (marca/copy):** emojis de bienvenida y de mensajes de estado de
  emergencia/metas.

---

# PARTE B — Iconos de categorías (datos + migración)

## B1. Modelo de datos

### Estado actual

```sql
categorias        ( ..., emoji text, color text, es_sistema boolean, ... )
movimientos       ( ..., emoji text, categoria_id uuid, ... )   -- emoji NULLABLE
categorias_viaje  ( ..., emoji text, ... )                       -- sistema paralelo
```

- `src/components/HojaCategoria.jsx`: selector = input de texto libre
  (`maxLength=4`) + 12 sugerencias hardcoded (`EMOJIS_SUGERIDOS`). Valida
  `emoji.trim()` no vacío.
- `src/services/categorias.js` (`agregarCategoria`/`actualizarCategoria`):
  pasa `emoji` tal cual a Supabase.
- **`movimientos.emoji` es una COPIA** hecha al crear el movimiento
  (`construirDatosMovimiento` / `HojaNuevoMovimiento` / `gastosFijos.js`). No
  se re-deriva.
- **`Movimiento.jsx`** (fila de lista: Home / DetalleCuenta / DetalleCategoria)
  muestra `movimiento.emoji` (la copia). `src/hooks/useMovimientosPeriodo.js`
  **no** trae la categoría, solo `categoria_id` + `emoji`.
- **`Resumen.jsx`** SÍ hace join a
  `categorias(id,nombre,emoji,color,es_sistema)` y
  `src/utils/resumenCalculos.js` toma `categoria?.emoji` **en vivo** → si
  editas el emoji de una categoría, el Resumen se actualiza pero las filas de
  movimiento viejas no. **Inconsistencia que ya existe hoy.**

### Decisión: columna nueva, no reemplazo

`ALTER TABLE categorias ADD COLUMN icono text;` (nullable, sin default).

- Conservar `emoji` intacto ≥ 3-4 releases. Es la red de rollback y la fuente
  del mapeo.
- La app lee con cascada de fallback (ver B4).
- Fase de limpieza futura (opcional, semanas después):
  `ALTER TABLE categorias DROP COLUMN emoji` una vez que `icono` esté 100 %
  poblado y ninguna versión viva de la app lea `emoji`.

**Por qué no reemplazar in-place:** perderías la información original si el
mapeo automático se equivoca, y no habría rollback de datos.

### `movimientos`: `ADD COLUMN icono text;` + modelo snapshot (MVP)

- El movimiento sigue guardando su icono al crearse (copia de
  `categoria.icono`, o el icono fijo del tipo para
  ingreso/traslado/retiro/pago_tarjeta).
- `Movimiento.jsx` renderiza
  `<IconoCategoria nombre={movimiento.icono} color={...} />`.
- **Ventaja:** mínimo cambio, no toca la consulta caliente
  `useMovimientosPeriodo`, respeta "así se veía cuando lo registré".
- **Desventaja:** perpetúa la inconsistencia con Resumen. →
  **Fase futura opcional B-EXTRA:** añadir
  `categoria:categorias!categoria_id(icono,color)` al select de
  `useMovimientosPeriodo` y derivar en vivo en `Movimiento.jsx` (con
  `movimiento.icono` como fallback para categoría borrada).

**Color del icono en la fila:** para `tipo === 'gasto'` con categoría → color
de la categoría. Para ingreso/traslado/retiro/pago_tarjeta → el color de
acento que `Movimiento.jsx` ya calcula
(`text-mint`/`text-azul`/`text-coral`/`text-gold`).

## B2. El catálogo de iconos

`src/utils/catalogoIconos.js` — mapa **explícito y curado** (no
`import * as lucide`), para que el tree-shaking solo incluya lo elegido (el
bundle ya está en ~209 KB gzip y con warning >500 KB).

```js
// Estructura
export const GRUPOS_ICONOS = [
  { clave: 'comida',      iconos: ['utensils','coffee','pizza','apple','beer','wine','cake','cookie','soup','fish','carrot','ham'] },
  { clave: 'transporte',  iconos: ['car','bus','train-front','bike','fuel','plane','ship','taxi-front','parking-meter','truck'] },
  { clave: 'hogar',       iconos: ['house','sofa','bed','lamp','wrench','plug','trash-2','washing-machine','key','paintbrush','hammer'] },
  { clave: 'servicios',   iconos: ['zap','droplet','flame','wifi','phone','tv','router','recycle'] },
  { clave: 'salud',       iconos: ['pill','heart-pulse','stethoscope','cross','activity','dumbbell','glasses','brain'] },
  { clave: 'ocio',        iconos: ['clapperboard','music','gamepad-2','ticket','book-open','palette','camera','headphones','party-popper','dice-5'] },
  { clave: 'compras',     iconos: ['shopping-cart','shopping-bag','shirt','gift','tag','store','gem','watch','footprints'] },
  { clave: 'finanzas',    iconos: ['piggy-bank','banknote','credit-card','wallet','coins','landmark','trending-up','receipt','hand-coins','arrow-left-right','arrow-down-left','arrow-up-right'] },
  { clave: 'trabajo_educacion', iconos: ['briefcase','graduation-cap','laptop','pen-tool','presentation','building-2'] },
  { clave: 'personas_mascotas', iconos: ['users','baby','paw-print','dog','cat','heart'] },
  { clave: 'viajes',      iconos: ['plane','map-pin','luggage','tent','palmtree','mountain','hotel'] },
  { clave: 'otros',       iconos: ['tag','sparkles','pin','star','circle-dashed','more-horizontal','shapes'] },
]

// Resolución nombre -> componente (solo los del catálogo se importan)
import { Utensils, Coffee, /* ...todos los del catálogo... */, Tag } from 'lucide-react'
export const ICONOS = { 'utensils': Utensils, 'coffee': Coffee, /* ... */, 'tag': Tag }
export const ICONO_FALLBACK = 'tag'
export function resolverIcono(nombre) { return ICONOS[nombre] ?? ICONOS[ICONO_FALLBACK] }
```

- **~120-150 iconos** (vs 12 sugerencias de emoji hoy) → cubre "más variedad".
- `<IconoCategoria nombre color size>` = wrapper que hace `resolverIcono(nombre)`
  + aplica `style={{ color }}` + tamaño de la escala A2 + `aria-hidden`.
- **Test de integridad:** cada nombre del catálogo existe en `ICONOS`; cada
  `ICONOS[k]` es un componente; ningún grupo vacío; `tag` presente.

> Nota: verificar los nombres exactos de lucide contra la versión instalada
> (`lucide-react` `^1.31.0`) antes de fijar el catálogo — algunos nombres
> cambian entre versiones (p. ej. `home` vs `house`, `more-horizontal` vs
> `ellipsis`).

## B3. El selector

Nuevo `src/components/SelectorIcono.jsx` (reemplaza el input de emoji en
`HojaCategoria.jsx`; análogo para `HojaNuevaCategoriaViaje.jsx` en la fase
VIAJE):

- **Grid de iconos** agrupado por `GRUPOS_ICONOS`, con encabezado de grupo
  (i18n, ver abajo).
- Cada celda: el icono renderizado **con el color de categoría ya
  seleccionado** (feedback inmediato), tile compacto estilo asistente
  (`rounded-xl`, `ring-2 ring-mint` en el elegido).
- **Buscador** (input arriba): filtra por nombre de icono. MVP: match sobre el
  nombre lucide (inglés). Mejora posterior: mapa de sinónimos
  `{ 'utensils': ['comida','restaurante','tenedor'], ... }` por locale.
- Estado: `icono` (string) en vez de `emoji`. Validación: `icono` presente y
  ∈ catálogo.
- Altura acotada + scroll interno (mismo patrón que el panel del asistente).
- A11y: `role="radiogroup"`, celdas `role="radio"`, navegación por teclado.

**Cambios en cadena por el selector:**

- `HojaCategoria.jsx`: estado `emoji`→`icono`,
  `EMOJIS_SUGERIDOS`→catálogo, `manejarCambioEmoji`→`setIcono`, validación
  `errorEmojiVacio`→`errorIconoVacio`, `datos.emoji`→`datos.icono`.
- `services/categorias.js`: `agregarCategoria`/`actualizarCategoria` reciben y
  persisten `icono` (dejar de mandar `emoji`, o mandar ambos durante la
  transición — ver fases).
- `GestionCategorias.jsx`, `DetalleCategoria.jsx`, `CategoriaGasto.jsx`,
  `DesgloseCategoriasResumen.jsx`, `HojaNuevoMovimiento.jsx` (grid),
  `asistente-movimiento/pasos/PasoCategoria.jsx`,
  `asistente-movimiento/resumen.js` (chips `${emoji} ${nombre}` → icono +
  nombre), `HojaReasignarCategoria.jsx`: cambiar `{categoria.emoji}` en
  `<span>`/`<div>` por
  `<IconoCategoria nombre={categoria.icono} color={categoria.color} />`.
- `resumenCalculos.js`: `EMOJI_SIN_CATEGORIA='✨'` →
  `ICONO_SIN_CATEGORIA='sparkles'`.
- `Resumen.jsx`: select
  `categorias(id,nombre,emoji,color,es_sistema)` → añadir `icono`.

## B4. Migración de categorías existentes — mapa emoji → icono

### Dónde: SQL (backfill + trigger) + fallback en la app

**SQL** — script nuevo `sql/supabase_iconos_categorias.sql`, estilo de los
existentes: idempotente, sin `DROP`/`DELETE`, con `SELECT` de dry-run antes de
cada `UPDATE`:

1. `ALTER TABLE categorias ADD COLUMN IF NOT EXISTS icono text;`
2. `ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS icono text;`
3. **Dry-run** (solo lectura):
   `SELECT emoji, count(*) FROM categorias WHERE icono IS NULL GROUP BY emoji;`
4. **Backfill categorías** con `CASE`:

```sql
UPDATE categorias SET icono = CASE emoji
  WHEN '🛒' THEN 'shopping-cart'
  WHEN '🎬' THEN 'clapperboard'
  WHEN '🎥' THEN 'clapperboard'
  WHEN '🐜' THEN 'coffee'        -- "gastos hormiga" (decisión confirmada)
  WHEN '🚌' THEN 'bus'
  WHEN '🚗' THEN 'car'
  WHEN '⛽' THEN 'fuel'
  WHEN '📌' THEN 'pin'            -- categoría de sistema (gastos fijos)
  WHEN '💊' THEN 'pill'
  WHEN '🏥' THEN 'stethoscope'
  WHEN '🏠' THEN 'house'
  WHEN '🍔' THEN 'utensils'
  WHEN '🍽️' THEN 'utensils'
  WHEN '☕' THEN 'coffee'
  WHEN '👕' THEN 'shirt'
  WHEN '🛍️' THEN 'shopping-bag'
  WHEN '📚' THEN 'book-open'
  WHEN '🎓' THEN 'graduation-cap'
  WHEN '🐾' THEN 'paw-print'
  WHEN '🎁' THEN 'gift'
  WHEN '✈️' THEN 'plane'
  WHEN '🏨' THEN 'hotel'
  WHEN '🚕' THEN 'taxi-front'
  WHEN '💡' THEN 'zap'
  WHEN '💰' THEN 'piggy-bank'
  WHEN '💳' THEN 'credit-card'
  WHEN '✨' THEN 'sparkles'       -- "Varios"
  WHEN '🎮' THEN 'gamepad-2'
  WHEN '🎟️' THEN 'ticket'
  WHEN '🍹' THEN 'wine'
  WHEN '🏖️' THEN 'palmtree'
  WHEN '📷' THEN 'camera'
  WHEN '🎒' THEN 'luggage'
  ELSE 'tag'                      -- fallback general (decisión confirmada)
END
WHERE icono IS NULL;
```

(Mapa a completar/afinar cubriendo los seeds actual+viejo, los
`EMOJIS_SUGERIDOS` de ambos formularios, y los emojis más comunes que
aparezcan en el dry-run del paso 3.)

5. **Backfill movimientos** — mismo `CASE` extendido con los emojis de tipo:

```sql
-- añadir a las ramas del CASE:
--   WHEN '🔄' THEN 'arrow-left-right'   -- traslado
--   WHEN '🏧' THEN 'banknote'           -- retiro
--   WHEN '💳' THEN 'credit-card'        -- pago_tarjeta
--   WHEN '💰' THEN 'arrow-down-left'    -- ingreso (coherente con PasoTipo)
--   WHEN '📌' THEN 'pin'                -- gasto fijo pagado
UPDATE movimientos SET icono = CASE emoji ... END WHERE icono IS NULL;
```

> Ojo: para categorías, `💰` → `piggy-bank`; para movimientos, `💰` (ingreso)
> → `arrow-down-left`. Son dos `CASE` distintos.

6. **Trigger `handle_new_user()`** — `create or replace` con la versión
   VIGENTE (la de `sql/supabase_fix_trigger_categorias.sql`, con su bloque de
   consentimientos **intacto**) cambiando **solo** el INSERT de categorías:
   añadir columna `icono` con el valor directo, es/en:

   | Categoría (es / en) | emoji actual | `icono` |
   |---|---|---|
   | Mercado / Groceries | 🛒 | `shopping-cart` |
   | Ocio / Leisure | 🎬 | `clapperboard` |
   | Gastos hormiga / Small daily expenses | 🐜 | `coffee` |
   | Transporte / Transport | 🚌 | `bus` |
   | Gasolina / Fuel | ⛽ | `fuel` |
   | Gastos fijos / Fixed expenses | 📌 | `pin` |

   Dejar `emoji` en el INSERT durante la transición (o quitarlo si ya se
   decidió el drop).

7. **Verificación**:
   `SELECT count(*) FROM categorias WHERE icono IS NULL;` debe dar 0.
   Idem `movimientos`.

> ⚠️ Regla del proyecto (`sql/README.md`): **verificar el trigger real** con
> `pg_get_functiondef` antes de dar nada por aplicado, y actualizar el README
> (este sería el "paso 22").

**App — fallback defensivo** — `src/utils/mapaEmojiIcono.js` (función pura):

```js
resolverIconoCategoria(categoria) = categoria.icono ?? mapaEmojiIcono(categoria.emoji) ?? 'tag'
```

`mapaEmojiIcono` = el mismo `CASE` portado a JS. Cubre la ventana entre deploy
y ejecución del SQL, y cualquier categoría creada en ese hueco. Testeable.

### Reversibilidad

- **Datos:** `emoji` nunca se toca → `UPDATE ... SET icono = NULL` revierte, o
  simplemente se ignora la columna.
- **Código:** revertir el/los PR.
- **Trigger:** re-aplicar la versión previa (queda en git).

## B5. Movimientos existentes

- **Se migran** vía el paso 5 del SQL (`movimientos.icono` desde
  `movimientos.emoji`).
- Los que tienen `emoji` NULL → `Movimiento.jsx` cae al fallback por tipo.
- **No** se re-derivan de la categoría en el MVP (modelo snapshot). La fase
  B-EXTRA opcional cambia esto.

---

## Consideraciones transversales

**Impacto por superficie:**

| Superficie | Cambio |
|---|---|
| Asistente (`PasoCategoria`, `resumen.js` chips, `ResumenBorrador`) | `categoria.emoji` → `<IconoCategoria>`. `chipsResumen` deja de concatenar string; el chip renderiza icono + texto. Ajustar `resumen.test.js` (fixture `emoji`→`icono`). |
| Reportes (`Resumen.jsx`, `DesgloseCategoriasResumen`, `resumenCalculos`) | añadir `icono` al select + al objeto agrupado; fallback `sparkles`/`tag`. Tests de `resumenCalculos` actualizados. |
| Lista de movimientos (`Movimiento.jsx`) | icono líder pasa de `{emoji}` (`text-lg`) a `<IconoCategoria nombre={movimiento.icono} color={...} />`. Ajustar el tile (quitar `text-lg`, centrar SVG). |
| `construirDatosMovimiento.js` | devuelve `icono`: gasto→`categoria.icono`, ingreso→`'arrow-down-left'`, traslado→`'arrow-left-right'`, retiro→`'banknote'`, pago_tarjeta→`'credit-card'`. Tests reescritos. |
| `gastosFijos.js` | `emoji:'📌'` → `icono:'pin'`. Tests. |
| `services/movimientos.js` | pasa `datos.icono` al insert. Tests (`movimientos.test.js`) — muchos `emoji:` en fixtures. |
| `services/categorias.js` | persiste `icono`. Tests (`categorias.test.js`). |
| i18n | nuevas claves `iconos.grupos.*` (comida/transporte/hogar/servicios/salud/ocio/compras/finanzas/trabajo_educacion/personas_mascotas/viajes/otros), `categorias.formulario.iconoLabel/iconoAria/errorIconoVacio`, `viajes.categoriaFormulario.*` análogas. `src/i18n/paridad.test.js` **obliga** es/en simétricos. |
| `categorias_viaje` (viaje) | Fase paralela opcional: `categoriasViaje.js` (`CATEGORIAS_POR_DEFECTO` con `emoji`), `HojaNuevaCategoriaViaje.jsx`, `GastoViaje.jsx`, `TarjetaCategoriaViaje.jsx`, `ResumenViaje.jsx`, tabla `categorias_viaje.icono`. |

**Tests a crear / actualizar:**

- `src/utils/catalogoIconos.test.js` — integridad (nombres ↔ componentes,
  grupos no vacíos, `tag` presente).
- `src/utils/mapaEmojiIcono.test.js` — cada emoji de seed (actual+viejo) y de
  `EMOJIS_SUGERIDOS` mapea a un nombre que existe en el catálogo; desconocido
  → `'tag'`.
- Reescritura de fixtures `emoji`→`icono` en:
  `construirDatosMovimiento.test.js`, `movimientos.test.js`,
  `categorias.test.js`, `resumenCalculos.test.js`, `mapearMovimiento.test.js`,
  `asistente-movimiento/resumen.test.js`, `gastosFijos.test.js`.
- `src/i18n/paridad.test.js` ya cubre la simetría de las claves de grupos.
- SQL: no unit-testeable → el script incluye los `SELECT` de dry-run y
  verificación.

**Bundle:** catálogo explícito (~150 named imports) tree-shakea a solo esos.
Evitar `import * as` y evitar `DynamicIcon`/`lazy` en listas (parpadeo). Medir
`npm run build` antes/después (hoy ~209 KB gzip, warning >500 KB — vigilar).

---

## FASES (incremental y revisable)

### Fase 0 — Fundaciones (sin cambio visible)

1. `src/utils/catalogoIconos.js` + `<IconoCategoria>` + `src/utils/mapaEmojiIcono.js`
   (función pura) + tests.
2. `src/components/ui/ICONS.md` con el estándar A2.

Revisable solo: tests verdes, sin tocar UI. Merge seguro.

### Fase A — Normalización de iconos de interfaz

3. Barrido de tamaños / `strokeWidth` / `aria-hidden` en los ~50 archivos
   lucide (por lotes: `views/`, `components/`, `asistente/`).
4. `🔒`/`🔄` de copy → lucide inline (`GestionCategorias`,
   `HojaNuevoMovimiento`); limpiar esas claves i18n.

Revisable: diffs mecánicos, sin cambio de datos.

### Fase B1 — Esquema (SQL, sin código que dependa aún)

5. `sql/supabase_iconos_categorias.sql`: `ADD COLUMN icono` en `categorias` y
   `movimientos` + dry-run selects. **Aplicar** (aditivo puro). Nada lo lee
   todavía → cero riesgo.

### Fase B2 — Lectura con fallback (código)

6. Todas las superficies de display (`CategoriaGasto`,
   `DesgloseCategoriasResumen`, `DetalleCategoria`, `GestionCategorias`,
   `Movimiento`, `PasoCategoria`, `asistente/resumen`, `HojaReasignarCategoria`,
   `HojaNuevoMovimiento` grid, `Resumen.jsx` select) leen
   `resolverIconoCategoria(categoria)` = `icono || mapaEmojiIcono(emoji) || 'tag'`.

   Con `icono` aún NULL en toda la BD → todo se renderiza vía el fallback JS.
   **La app ya se ve con iconos de línea.** `emoji` sigue en la BD intacto.

### Fase B3 — Backfill + trigger (SQL)

7. Ejecutar los `UPDATE` de backfill (`categorias.icono`, `movimientos.icono`)
   + `create or replace handle_new_user()` con `icono`. Verificar trigger
   real. Actualizar `sql/README.md` (paso 22).

### Fase B4 — Escritura (selector)

8. `SelectorIcono.jsx` + `HojaCategoria.jsx` (emoji→icono) +
   `services/categorias.js` persiste `icono`.
   `construirDatosMovimiento`/`gastosFijos`/`movimientos.js` escriben `icono`.
   Tests reescritos.

### Fase B5 — Limpieza de escritura de `emoji` (opcional, tras estabilizar)

9. Dejar de escribir `emoji` en inserts/updates (categorías y movimientos).
   `emoji` queda solo-lectura histórica.

### Fase B-EXTRA — Icono de movimiento en vivo (opcional)

10. `useMovimientosPeriodo` join a `categorias(icono,color)`; `Movimiento.jsx`
    deriva de la categoría con `movimiento.icono` como fallback. Elimina la
    inconsistencia lista ↔ Resumen.

### Fase VIAJE — Paralelo (opcional)

11. Repetir B1–B4 para `categorias_viaje` y sus 4 componentes +
    `categoriasViaje.js`.

### Fase LIMPIEZA FINAL — (semanas después, opcional)

12. `ALTER TABLE categorias DROP COLUMN emoji;` (y `movimientos`,
    `categorias_viaje`) una vez que ninguna versión viva de la app lo lea.
    Punto de no retorno → hacer con respaldo.

---

## Registro de avance

| Fase | Estado | Sesión / fecha | Notas |
|---|---|---|---|
| 0 | ✅ hecho | 2026-09-10 | `catalogoIconos.js` (159 iconos, 12 grupos), `IconoCategoria.jsx`, `mapaEmojiIcono.js` (+ `mapaEmojiIconoMovimiento`), tests (21, todos verdes), `ui/ICONS.md`. Nombres 1.x: `tree-palm`, `ellipsis`, `car-taxi-front`. Bundle sin cambio (el catálogo no lo importa código de app todavía). |
| A | ✅ hecho | 2026-09-10 | Barrido: el código ya estaba ~95% en la escala. Normalizado `h-3→h-3.5` (GastosFijos, TarjetaViaje, DetalleViaje) y `h-8→h-7` (Viajes vacío). aria-hidden: ya presente en todos. Semi-iconos: `🔒→<Lock>` (GestionCategorias), `🔄→<ArrowLeftRight>` (HojaNuevoMovimiento), `✓` quitado de `guardarBoton` (sin icono, el CTA mint ya es claro). Pendiente para otra pasada: carets `▾` en `metas.verProyeccion` y `GuiaUso`. |
| B1 | ✅ hecho | 2026-09-10 → ejecutado 2026-09-11 | `sql/supabase_iconos_categorias.sql`. `ADD COLUMN IF NOT EXISTS icono text` en `categorias`, `movimientos` **y `categorias_viaje`**. Confirmado ejecutado por el usuario en Supabase. |
| B2 | ✅ hecho | 2026-09-10 | `resolverIconoCategoria(categoria)` y `resolverIconoMovimiento(movimiento)` en `src/utils/resolverIconoCategoria.js` (+ 10 tests). Todas las superficies de display migradas a `<IconoCategoria>`: `CategoriaGasto`, `DesgloseCategoriasResumen` (+ `resumenCalculos.js`: `emoji`→`icono` resuelto, `ICONO_SIN_CATEGORIA='sparkles'`), `DetalleCategoria`, `GestionCategorias` (lista + categoría de sistema), `HojaReasignarCategoria`, `HojaNuevoMovimiento` (grid, sin `color` por contraste con el activo mint — ver comentario en el código), `PasoCategoria`, `resumen.js`/`ResumenBorrador` (chip con icono+color en vez de concatenar el emoji en el texto), `Resumen.jsx` (select agrega `icono`), `Movimiento.jsx` (icono líder + color de acento; gasto sin color de categoría propio hasta B-EXTRA). Solo se cambió el DISPLAY — la escritura (`emoji`) sigue igual. Bundle: **209.05 → 226.23 KB gzip (+17.18 KB)**, esperado (159 iconos ahora sí entran al bundle). Tests: 536 verdes. |
| B3 | ✅ hecho | 2026-09-11 | `sql/supabase_backfill_iconos.sql`. **Iteración 1** comparaba `CASE emoji WHEN '🛒' THEN ...` con el emoji tipeado literal; el dry-run mostró que casi todo caía en `'tag'`. Diagnóstico con `encode(emoji::bytea,'hex')`: el dato en la BD es UTF-8 canónico correcto — el bug estaba en que varios de los ~450 literales de emoji repetidos en el `.sql` se corrompieron al escribirse. **Iteración 2** (ejecutada): el `CASE` compara por `encode(emoji::bytea,'hex')` (ASCII puro, inmune a ese problema); los pares hex→icono se generaron programáticamente desde `src/utils/mapaEmojiIcono.js` y se verificaron contra el mapa fuente (446 líneas, 0 discrepancias) antes de correrlo. El BLOQUE 5 (trigger) no tenía el bug y no se modificó. Confirmado ejecutado por el usuario en Supabase. |
| B4 | ✅ hecho | 2026-09-11 | `SelectorIcono.jsx` (grid de los 12 grupos de `GRUPOS_ICONOS`, buscador con sinónimos en español para los más comunes, tiles con el color de categoría ya aplicado, `role="radiogroup"` + navegación por teclado). `HojaCategoria.jsx`: reemplazado el input de emoji + 12 sugeridas por `<SelectorIcono>`; estado `icono` (vacío hasta elegir, ya no arranca con un emoji por defecto); vista previa del icono con el color elegido; al editar, precarga con `resolverIconoCategoria(categoriaEditando)`. `services/categorias.js`: `agregarCategoria`/`actualizarCategoria` ya no aceptan ni envían `emoji` — solo `icono`. Decisión sobre `emoji` al crear: **se deja `NULL`** (la columna es nullable, sin default); no se inventa un emoji derivado del icono (sería un dato falso) ni se manda un placeholder. Al editar, como el UPDATE ya no incluye `emoji` en el payload, la columna queda intacta pase lo que pase (cumple la garantía de reversibilidad del plan). **Fix necesario no listado en el pedido original pero requerido para no regresionar:** `construirDatosMovimiento.js`, `services/gastosFijos.js` y `HojaPagoTarjeta.jsx` ahora también snapshottean `icono` en el movimiento (antes solo snapshotteaban `emoji`) — sin esto, un gasto contra una categoría nueva (con `emoji = NULL`) habría mostrado el icono genérico/de "sin categoría" en vez del icono real elegido. `services/movimientos.js` ya pasa `icono` en los 5 sitios de insert/update. i18n: `categorias.formulario.icono*` (reemplaza `emoji*`), nuevo namespace `iconos.grupos.*` (12 claves, es/en). **Fuera de alcance, diferido a la Fase VIAJE:** `HojaNuevaCategoriaViaje.jsx` / `categorias_viaje` siguen con el selector de emoji viejo — sistema paralelo, cambiarlo ahora hubiera duplicado la superficie de este cambio sin necesidad. Tests: 536 verdes (mismo número que B2 — se sumaron aserciones a tests existentes, no `it()` nuevos, salvo ninguno nuevo). Bundle: 226.23 → 228.77 KB gzip (+2.54 KB, por `SelectorIcono.jsx` + `Search` de lucide). Sin commit — el usuario pidió probarlo en local primero. |
| B5 | ⬜ pendiente | | |
| B-EXTRA | ⬜ opcional | | |
| VIAJE | ⬜ opcional | | |
| LIMPIEZA | ⬜ opcional | | |
